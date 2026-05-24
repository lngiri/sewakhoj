import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@sewakhoj.com";

// Web Push implementation for Deno
// Uses raw fetch to the push service endpoint with VAPID authentication
async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Convert base64url to Uint8Array
    function base64UrlToUint8Array(base64UrlString: string): Uint8Array {
      const padding = "=".repeat((4 - (base64UrlString.length % 4)) % 4);
      const base64 = (base64UrlString + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    function uint8ArrayToBase64Url(arr: Uint8Array): string {
      let binary = "";
      for (let i = 0; i < arr.length; i++) {
        binary += String.fromCharCode(arr[i]);
      }
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    // Generate VAPID headers
    const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);
    const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);

    // Import VAPID key pair
    const keyPair = await crypto.subtle.importKey(
      "ECDSA",
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      {
        key: privateKeyBytes,
        format: "raw",
        type: "private",
        usages: ["sign"],
      },
      true,
      ["sign"]
    );

    // Create JWT header
    const header = { typ: "JWT", alg: "ES256" };
    const jwtHeader = uint8ArrayToBase64Url(
      new TextEncoder().encode(JSON.stringify(header))
    );

    // Create JWT payload
    const jwtPayload = {
      aud: new URL(subscription.endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      sub: VAPID_SUBJECT,
    };
    const jwtPayloadStr = uint8ArrayToBase64Url(
      new TextEncoder().encode(JSON.stringify(jwtPayload))
    );

    // Sign the JWT
    const signatureInput = new TextEncoder().encode(`${jwtHeader}.${jwtPayloadStr}`);
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      keyPair,
      signatureInput
    );
    const jwtSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
    const vapidJwt = `${jwtHeader}.${jwtPayloadStr}.${jwtSignature}`;

    // Encrypt payload
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Import user's public key for ECDH
    const userPublicKeyBytes = base64UrlToUint8Array(subscription.p256dh_key);
    const userPublicKey = await crypto.subtle.importKey(
      "raw",
      userPublicKeyBytes,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // Generate local ECDH key pair
    const localKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );

    // Export local public key
    const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
    const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPublicKey },
      localKeyPair.privateKey,
      256
    );

    // HKDF to derive encryption key
    const authSecretBytes = base64UrlToUint8Array(subscription.auth_key);
    const sharedSecretBytes = new Uint8Array(sharedSecret);

    // Combine auth secret and shared secret for HKDF
    const ikm = new Uint8Array(sharedSecretBytes.length);
    ikm.set(sharedSecretBytes);

    // Import as HKDF key
    const hkdfKey = await crypto.subtle.importKey(
      "raw",
      ikm,
      { name: "HKDF" },
      false,
      ["deriveBits"]
    );

    // Create info buffer
    const info = new TextEncoder().encode("Content-Encoding: aes128gcm\0");

    // Derive content encryption key
    const cek = await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: authSecretBytes,
        info: info,
      },
      hkdfKey,
      128
    );

    // Generate nonce
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt payload with AES-128-GCM
    const aesKey = await crypto.subtle.importKey(
      "raw",
      cek,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const encryptedPayload = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      payloadBytes
    );

    // Build the encrypted content
    const encryptedBytes = new Uint8Array(encryptedPayload);
    const content = new Uint8Array(
      salt.length + 4 + localPublicKeyBytes.length + 1 + nonce.length + 2 + encryptedBytes.length
    );

    let offset = 0;
    // Salt
    content.set(salt, offset); offset += salt.length;
    // Record size (4096 as 4 bytes big-endian)
    content[offset] = 0; content[offset + 1] = 0; content[offset + 2] = 16; content[offset + 3] = 0; offset += 4;
    // Public key length
    content[offset] = 65; offset += 1;
    // Public key
    content.set(localPublicKeyBytes, offset); offset += localPublicKeyBytes.length;
    // Content
    content.set(encryptedBytes, offset);

    // Send to push service
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Authorization": `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
        "TTL": "86400",
      },
      body: content,
    });

    if (response.status === 410) {
      // Subscription expired/unsubscribed
      console.log("Push subscription expired (410 Gone)");
      return false;
    }

    if (!response.ok) {
      console.error(`Push service returned ${response.status}: ${await response.text()}`);
      return false;
    }

    console.log("Push notification sent successfully");
    return true;
  } catch (error) {
    console.error("Web push error:", error);
    return false;
  }
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", user_id)
      .single();

    if (prefs && prefs.push_enabled === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: "push_disabled" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get all push subscriptions for the user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No push subscriptions found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log("VAPID keys not configured — logging push:");
      console.log(`Push to ${user_id}:`, { title, body, data });
      return new Response(
        JSON.stringify({ success: true, mock: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      data: data || {},
      icon: "/logo.png",
      badge: "/logo.png",
      timestamp: Date.now(),
    });

    let successCount = 0;
    const expiredSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      const sent = await sendWebPush(
        {
          endpoint: sub.endpoint,
          p256dh_key: sub.p256dh_key || sub.p256dh,
          auth_key: sub.auth_key || sub.auth,
        },
        payload,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );

      if (sent) {
        successCount++;
      } else {
        // Check if it's a 410 Gone (expired)
        expiredSubscriptions.push(sub.id);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions);
      console.log(`Cleaned up ${expiredSubscriptions.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        expired: expiredSubscriptions.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
