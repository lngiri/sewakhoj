"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  CreditCard,
  Map,
  MessageSquare,
  Smartphone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Zap,
  Globe,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { auditLog } from "@/lib/auditLog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Integration {
  id: string;
  service_name: string;
  encrypted_api_key: string | null;
  encrypted_api_secret: string | null;
  endpoint_url: string;
  merchant_id: string;
  is_enabled: boolean;
  configuration: any;
}

export default function IntegrationsAdminPage() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Masked keys for display (fetched via RPC)
  const [maskedKeys, setMaskedKeys] = useState<Record<string, { key: string; secret: string }>>({});

  // Revealed plain-text keys (only stored temporarily after explicit reveal)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, { key: string | null; secret: string | null }>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Editable plain-text values (for new key input)
  const [editKeys, setEditKeys] = useState<Record<string, { key: string; secret: string }>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);

    // Fetch integrations with encrypted columns (api_key/api_secret are restricted by column-level GRANTs)
    const { data, error } = await supabase
      .from('api_integrations')
      .select('id, service_name, encrypted_api_key, encrypted_api_secret, endpoint_url, merchant_id, is_enabled, configuration')
      .order('service_name');

    if (!error && data) {
      setIntegrations(data);

      // Fetch masked keys for each integration via RPC
      const masked: Record<string, { key: string; secret: string }> = {};
      for (const int of data) {
        try {
          const { data: maskedKey } = await supabase.rpc('get_masked_api_key', {
            service_name_param: int.service_name
          });
          masked[int.id] = { key: maskedKey || '••••••••', secret: '••••••••' };
        } catch {
          masked[int.id] = { key: '••••••••', secret: '••••••••' };
        }
      }
      setMaskedKeys(masked);
    }
    setLoading(false);
  };

  const handleReveal = async (integration: Integration) => {
    setRevealingId(integration.id);
    try {
      const results: { key: string | null; secret: string | null } = { key: null, secret: null };

      if (integration.encrypted_api_key) {
        const { data: decryptedKey } = await supabase.rpc('decrypt_api_key', {
          encrypted_key: integration.encrypted_api_key
        });
        results.key = decryptedKey || null;
      }

      if (integration.encrypted_api_secret) {
        const { data: decryptedSecret } = await supabase.rpc('decrypt_api_key', {
          encrypted_key: integration.encrypted_api_secret
        });
        results.secret = decryptedSecret || null;
      }

      setRevealedKeys(prev => ({ ...prev, [integration.id]: results }));
    } catch (err) {
      showError("Failed to decrypt keys. Check your permissions.");
    } finally {
      setRevealingId(null);
    }
  };

  const handleHide = (id: string) => {
    setRevealedKeys(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateIntegration = async (integration: Integration) => {
    setSavingId(integration.id);

    try {
      // Get the plain-text values to save (from edit fields or revealed keys)
      const editKey = editKeys[integration.id]?.key;
      const editSecret = editKeys[integration.id]?.secret;
      const revealedKey = revealedKeys[integration.id]?.key;
      const revealedSecret = revealedKeys[integration.id]?.secret;

      // Encrypt new key if provided in edit field
      let encryptedKey = integration.encrypted_api_key;
      if (editKey !== undefined && editKey !== '') {
        const { data: encKey } = await supabase.rpc('encrypt_api_key', { raw_key: editKey });
        encryptedKey = encKey || null;
      }

      // Encrypt new secret if provided in edit field
      let encryptedSecret = integration.encrypted_api_secret;
      if (editSecret !== undefined && editSecret !== '') {
        const { data: encSecret } = await supabase.rpc('encrypt_api_key', { raw_key: editSecret });
        encryptedSecret = encSecret || null;
      }

      const { error } = await supabase
        .from('api_integrations')
        .update({
          encrypted_api_key: encryptedKey,
          encrypted_api_secret: encryptedSecret,
          merchant_id: integration.merchant_id,
          endpoint_url: integration.endpoint_url,
          is_enabled: integration.is_enabled,
          configuration: integration.configuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (!error) {
        showSuccess(`${integration.service_name.toUpperCase()} integration updated.`);
        await auditLog('integration_updated', { integration_id: integration.id, service_name: integration.service_name, is_enabled: integration.is_enabled }, user?.id || '');
        // Clear edit and reveal state for this integration
        setEditKeys(prev => {
          const next = { ...prev };
          delete next[integration.id];
          return next;
        });
        setRevealedKeys(prev => {
          const next = { ...prev };
          delete next[integration.id];
          return next;
        });
        fetchIntegrations();
      } else {
        showError("Failed to save changes: " + error.message);
      }
    } catch (err: any) {
      showError("Failed to save changes: " + (err.message || "Unknown error"));
    }
    setSavingId(null);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'esewa': return <CreditCard className="w-6 h-6" />;
      case 'maps': return <Map className="w-6 h-6" />;
      case 'whatsapp': return <MessageSquare className="w-6 h-6" />;
      case 'sms_gateway': return <Smartphone className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  if (loading) {
    return <div className="p-20 text-center font-black uppercase text-xs tracking-widest text-gray-400">Synchronizing Integrations...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               Connect Hub <Globe className="w-8 h-8 text-blue-500" />
            </h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage External API Keys & Gateways</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
           <Lock className="w-4 h-4 text-green-600" />
           <span className="text-[10px] font-black uppercase tracking-widest text-green-600">AES-256 Encrypted Storage</span>
        </div>
      </div>

      {/* INTEGRATIONS LIST */}
      <div className="grid grid-cols-1 gap-8">
        {integrations.map((int) => {
          const isRevealed = !!revealedKeys[int.id];
          const isRevealing = revealingId === int.id;
          const masked = maskedKeys[int.id] || { key: '••••••••', secret: '••••••••' };
          const revealed = revealedKeys[int.id];
          const edit = editKeys[int.id];

          // Determine display values for key and secret
          const displayKey = isRevealed && revealed?.key ? revealed.key : (edit?.key !== undefined ? edit.key : masked.key);
          const displaySecret = isRevealed && revealed?.secret ? revealed.secret : (edit?.secret !== undefined ? edit.secret : masked.secret);
          const isKeyMasked = !isRevealed && (edit?.key === undefined || edit?.key === '');
          const isSecretMasked = !isRevealed && (edit?.secret === undefined || edit?.secret === '');

          return (
          <div key={int.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden group hover:border-blue-200 transition-all duration-500">
            <div className="p-8 md:p-10">
              {/* Card Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-50">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all ${int.is_enabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-300'}`}>
                    {getIcon(int.service_name)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{int.service_name}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      {int.is_enabled ? '● Active Connection' : '○ Connection Paused'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 mr-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enabled</span>
                      <button
                        onClick={() => {
                          const updated = { ...int, is_enabled: !int.is_enabled };
                          setIntegrations(prev => prev.map(i => i.id === int.id ? updated : i));
                        }}
                        className={`w-14 h-8 rounded-full relative transition-all ${int.is_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${int.is_enabled ? 'right-1' : 'left-1'}`} />
                      </button>
                   </div>
                   <button
                    onClick={() => updateIntegration(int)}
                    disabled={savingId === int.id}
                    className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                   >
                     {savingId === int.id ? <LoadingSpinner size="xs" /> : <Save className="w-4 h-4" />}
                     Save Config
                   </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MERCHANT ID / APP ID */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">
                    {int.service_name === 'esewa' ? 'Merchant ID' : 'Client / App ID'}
                  </label>
                  <input
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={int.merchant_id || ""}
                    onChange={e => setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, merchant_id: e.target.value } : i))}
                    placeholder="Enter ID..."
                  />
                </div>

                {/* ENDPOINT URL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Service Endpoint</label>
                  <input
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={int.endpoint_url || ""}
                    onChange={e => setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, endpoint_url: e.target.value } : i))}
                    placeholder="https://api.service.com/v1"
                  />
                </div>

                {/* API KEY */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center justify-between">
                    API Key
                    <div className="flex items-center gap-1">
                      {int.encrypted_api_key && (
                        isRevealed ? (
                          <button
                            onClick={() => handleHide(int.id)}
                            className="text-amber-500 hover:text-amber-700 flex items-center gap-1"
                            title="Hide decrypted key"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReveal(int)}
                            disabled={isRevealing}
                            className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            title="Reveal decrypted key"
                          >
                            {isRevealing ? (
                              <LoadingSpinner size="xs" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </label>
                  <input
                    type={isKeyMasked ? "password" : "text"}
                    className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all ${
                      isKeyMasked
                        ? "bg-gray-100 text-gray-400 border-transparent cursor-default"
                        : "bg-gray-50 border-transparent focus:bg-white focus:border-blue-500"
                    }`}
                    value={displayKey}
                    readOnly={isKeyMasked}
                    onChange={e => {
                      if (!isKeyMasked) {
                        setEditKeys(prev => ({ ...prev, [int.id]: { ...prev[int.id], key: e.target.value, secret: prev[int.id]?.secret || '' } }));
                      }
                    }}
                    onFocus={() => {
                      // When user clicks a masked field, switch to edit mode
                      if (isKeyMasked) {
                        setEditKeys(prev => ({ ...prev, [int.id]: { key: '', secret: prev[int.id]?.secret || '' } }));
                      }
                    }}
                    placeholder={isKeyMasked ? masked.key : "Enter new API key..."}
                  />
                  {isKeyMasked && int.encrypted_api_key && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                      Click to enter new key • Use <Eye className="w-3 h-3 inline" /> to reveal current
                    </p>
                  )}
                </div>

                {/* API SECRET */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center justify-between">
                    API Secret / Private Key
                  </label>
                  <input
                    type={isSecretMasked ? "password" : "text"}
                    className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all ${
                      isSecretMasked
                        ? "bg-gray-100 text-gray-400 border-transparent cursor-default"
                        : "bg-gray-50 border-transparent focus:bg-white focus:border-blue-500"
                    }`}
                    value={displaySecret}
                    readOnly={isSecretMasked}
                    onChange={e => {
                      if (!isSecretMasked) {
                        setEditKeys(prev => ({ ...prev, [int.id]: { key: prev[int.id]?.key || '', secret: e.target.value } }));
                      }
                    }}
                    onFocus={() => {
                      if (isSecretMasked) {
                        setEditKeys(prev => ({ ...prev, [int.id]: { key: prev[int.id]?.key || '', secret: '' } }));
                      }
                    }}
                    placeholder={isSecretMasked ? masked.secret : "Enter new API secret..."}
                  />
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
