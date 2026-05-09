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
  Globe
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";

interface Integration {
  id: string;
  service_name: string;
  api_key: string;
  api_secret: string;
  endpoint_url: string;
  merchant_id: string;
  is_enabled: boolean;
  configuration: any;
}

export default function IntegrationsAdminPage() {
  const { showSuccess, showError } = useNotification();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from('api_integrations')
      .select('*')
      .order('service_name');
    
    if (!error && data) {
      setIntegrations(data);
    }
    setLoading(false);
  };

  const updateIntegration = async (integration: Integration) => {
    setSavingId(integration.id);
    const { error } = await supabase
      .from('api_integrations')
      .update({
        api_key: integration.api_key,
        api_secret: integration.api_secret,
        merchant_id: integration.merchant_id,
        endpoint_url: integration.endpoint_url,
        is_enabled: integration.is_enabled,
        configuration: integration.configuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);

    if (!error) {
      showSuccess(`${integration.service_name.toUpperCase()} integration updated.`);
      fetchIntegrations();
    } else {
      showError("Failed to save changes.");
    }
    setSavingId(null);
  };

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
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
        <div className="flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
           <Shield className="w-4 h-4 text-blue-600" />
           <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Encrypted Key Storage Active</span>
        </div>
      </div>

      {/* INTEGRATIONS LIST */}
      <div className="grid grid-cols-1 gap-8">
        {integrations.map((int) => (
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
                     {savingId === int.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
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
                    <button onClick={() => toggleSecret(int.id)} className="text-blue-500 hover:text-blue-700">
                       {showSecrets[int.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </label>
                  <input 
                    type={showSecrets[int.id] ? "text" : "password"}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={int.api_key || ""}
                    onChange={e => setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, api_key: e.target.value } : i))}
                    placeholder="pk_test_..."
                  />
                </div>

                {/* API SECRET */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center justify-between">
                    API Secret / Private Key
                  </label>
                  <input 
                    type={showSecrets[int.id] ? "text" : "password"}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={int.api_secret || ""}
                    onChange={e => setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, api_secret: e.target.value } : i))}
                    placeholder="sk_test_..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
