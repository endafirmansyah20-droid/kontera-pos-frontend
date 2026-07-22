import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useInstallPrompt } from '../context/PwaInstallContext';
import { isMobileDevice } from '../utils/device';

export default function LoginPage() {
  const [form, setForm]       = useState({ username:'', password:'' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle }  = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();
  const navigate   = useNavigate();
  const inputRef   = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 400); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Isi username dan password!');
    setLoading(true);
    try {
      const result = await login(form.username, form.password);
      navigate('/dashboard');
      toast.success(`Selamat datang, ${result?.user?.name || 'Pengguna'}! 👋`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans',sans-serif", background:'#06010f', position:'relative', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes b1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}
        @keyframes b2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,20px)}}
        @keyframes b3{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-20px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes mqr{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .lp{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:52px 56px;position:relative;z-index:1;overflow:hidden;min-height:0}
        .rp{width:460px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:40px 44px;position:relative;z-index:1}
        .gi{width:100%;box-sizing:border-box;padding:13px 16px 13px 44px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.11);border-radius:13px;color:#fff;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s,background .2s,box-shadow .2s}
        .gi::placeholder{color:rgba(255,255,255,0.24)}
        .gi:focus{background:rgba(37,99,235,0.1);border-color:rgba(59,130,246,0.65);box-shadow:0 0 0 4px rgba(37,99,235,0.12)}
        .gi:-webkit-autofill,.gi:-webkit-autofill:focus{-webkit-text-fill-color:white!important;-webkit-box-shadow:0 0 0 1000px #0d0520 inset!important}
        .btnl{width:100%;padding:14px;border:none;border-radius:13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:white;cursor:pointer;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#7c3aed 100%);box-shadow:0 6px 28px rgba(37,99,235,0.38);transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden;margin-top:6px}
        .btnl::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);transform:translateX(-100%);transition:transform .5s}
        .btnl:hover:not(:disabled)::after{transform:translateX(100%)}
        .btnl:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 36px rgba(37,99,235,0.52)}
        .btnl:disabled{opacity:.65;cursor:not-allowed}
        .fcard{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:13px 16px}
        .btn-install{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.78);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
        .btn-install:hover{background:rgba(37,99,235,0.12);border-color:rgba(59,130,246,0.35);color:#fff;transform:translateY(-1px)}
        @media(max-width:900px){.lp{display:none!important}.rp{width:100%!important;padding:32px 24px!important}}
      `}</style>

      {/* Blobs */}
      <div style={{position:'absolute',width:680,height:680,borderRadius:'50%',top:-180,left:-160,background:'radial-gradient(circle,rgba(37,99,235,0.22) 0%,transparent 65%)',animation:'b1 13s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',width:520,height:520,borderRadius:'50%',top:'28%',left:'32%',background:'radial-gradient(circle,rgba(192,38,211,0.16) 0%,transparent 65%)',animation:'b2 10s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',width:380,height:380,borderRadius:'50%',bottom:-80,right:-60,background:'radial-gradient(circle,rgba(234,179,8,0.1) 0%,transparent 65%)',animation:'b3 8s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)',backgroundSize:'64px 64px'}}/>

      {/* LEFT PANEL */}
      <div className="lp">
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{borderRadius:18,overflow:'hidden',boxShadow:'0 4px 16px rgba(37,99,235,0.35)',flexShrink:0}}>
            <img src="/Logo_KonterA.png" alt="KonterA" style={{height:52,display:'block',objectFit:'contain'}}
              onError={e=>{e.target.parentElement.style.display='none'}}/>
          </div>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:'white',letterSpacing:'-0.5px',lineHeight:1.1}}>KonterA</div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(234,179,8,0.85)',letterSpacing:'2.5px',textTransform:'uppercase',marginTop:3}}>POS System</div>
          </div>
        </div>

        {/* Headline */}
        <div>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(37,99,235,0.15)',border:'1px solid rgba(37,99,235,0.3)',borderRadius:100,padding:'5px 14px',marginBottom:24}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#3b82f6',boxShadow:'0 0 8px #3b82f6'}}/>
            <span style={{color:'rgba(147,197,253,0.9)',fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase'}}>Platform Manajemen Konter</span>
          </div>

          <h1 style={{fontSize:50,fontWeight:800,lineHeight:1.12,margin:'0 0 18px',letterSpacing:'-1.5px',background:'linear-gradient(135deg,#fff 20%,rgba(147,197,253,0.9) 55%,rgba(234,179,8,0.85) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Kelola Konter<br/>Lebih Cerdas<br/>&amp; Efisien
          </h1>

          <p style={{color:'rgba(255,255,255,0.38)',fontSize:14,lineHeight:1.8,maxWidth:350,margin:'0 0 28px'}}>
            Sistem POS modern untuk konter pulsa — kasir cepat, laporan real-time, multi-cabang, semua terintegrasi.
          </p>

          {/* Feature cards */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {e:'🛒',t:'Kasir Super Cepat',d:'Keyboard shortcut, scan barcode, transaksi dalam detik'},
              {e:'📊',t:'Laporan Real-time',d:'Omset, laba bersih, stok otomatis setiap transaksi'},
              {e:'🏪',t:'Multi-Cabang',d:'Pantau semua cabang dari satu dashboard'},
            ].map((f,i)=>(
              <div key={i} className="fcard">
                <div style={{width:40,height:40,borderRadius:12,background:'rgba(37,99,235,0.15)',border:'1px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{f.e}</div>
                <div>
                  <div style={{color:'white',fontWeight:700,fontSize:13,marginBottom:2}}>{f.t}</div>
                  <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,lineHeight:1.5}}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Marquee — flex-shrink:0 agar tidak push layout */}
          {(() => {
            const P1 = ['🛒 Kasir Cepat','📦 Stok Otomatis','💰 Laba Real-time','🏪 Multi-Cabang','🧾 Invoice Digital','📊 Export Excel','🔔 Notif Stok','👥 Multi-Role','🔒 Data Aman','💳 QRIS & Transfer'];
            const P2 = ['⚡ Keyboard Shortcut','📱 Struk Digital','🎯 Target Omset','📈 Grafik Penjualan','🔄 Void Transaksi','💸 Kelola Hutang','🧮 Closing Kas','🏷️ Kode Produk','📋 Riwayat','🌙 Dark Mode'];
            const pill = {display:'inline-flex',alignItems:'center',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'7px 14px',whiteSpace:'nowrap',flexShrink:0,marginRight:10,fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.65)'};
            const mask = {overflow:'hidden',maskImage:'linear-gradient(90deg,transparent 0%,black 8%,black 92%,transparent 100%)',WebkitMaskImage:'linear-gradient(90deg,transparent 0%,black 8%,black 92%,transparent 100%)',flexShrink:0};
            return (
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:20,flexShrink:0}}>
                <div style={mask}>
                  <div style={{display:'flex',width:'max-content',animation:'mq 28s linear infinite'}}>
                    {[...P1,...P1].map((t,i)=><div key={i} style={pill}>{t}</div>)}
                  </div>
                </div>
                <div style={mask}>
                  <div style={{display:'flex',width:'max-content',animation:'mqr 22s linear infinite reverse'}}>
                    {[...P2,...P2].map((t,i)=><div key={i} style={pill}>{t}</div>)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:36,paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          {[['99%','Akurasi'],['24/7','Uptime'],['Multi','Cabang']].map(([v,l])=>(
            <div key={l}>
              <div style={{fontSize:24,fontWeight:800,color:'white',letterSpacing:'-0.5px'}}>{v}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'1px',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rp">
        <div style={{width:'100%',maxWidth:380,background:'rgba(255,255,255,0.055)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderRadius:28,border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 32px 80px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.08)',padding:'38px 34px 34px'}}>
          {/* Logo di card */}
          <div style={{marginBottom:24}}>
            <div style={{borderRadius:14,overflow:'hidden',display:'inline-block',marginBottom:12,boxShadow:'0 2px 12px rgba(37,99,235,0.25)'}}>
              <img src="/Logo_KonterA.png" alt="KonterA" style={{height:40,display:'block',objectFit:'contain'}}
                onError={e=>{e.target.parentElement.style.display='none'}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:'white'}}>KonterA</div>
              <div style={{fontSize:9,fontWeight:700,color:'rgba(234,179,8,0.8)',letterSpacing:'2px',textTransform:'uppercase'}}>POS System</div>
            </div>
            <h2 style={{color:'white',fontSize:24,fontWeight:800,margin:'0 0 5px',letterSpacing:'-0.4px'}}>Selamat Datang 👋</h2>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:13.5,margin:0}}>Masuk ke dashboard konter Anda</p>
          </div>

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:8}}>Username atau Email</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:15,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)',fontSize:14,fontWeight:700}}>@</span>
                <input ref={inputRef} type="text" className="gi" placeholder="Username atau email"
                  value={form.username} onChange={e=>setForm({...form,username:e.target.value})} autoComplete="username"/>
              </div>
            </div>
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:8}}>Password</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:15,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)',fontSize:13}}>🔒</span>
                <input type={showPw?'text':'password'} className="gi" style={{paddingRight:46}} placeholder="Masukkan password..."
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete="current-password"/>
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.28)',display:'flex',padding:4,borderRadius:8,transition:'color .2s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.75)'}
                  onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.28)'}
                >{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
            </div>
            <button type="submit" className="btnl" disabled={loading}>
              {loading?<><Loader2 size={17} style={{animation:'spin 1s linear infinite'}}/>Memproses...</>:'Masuk ke Dashboard'}
            </button>
          </form>

          <div style={{display:'flex',alignItems:'center',gap:10,margin:'20px 0 0'}}>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}}/><span style={{color:'rgba(255,255,255,0.18)',fontSize:11}}>atau</span><div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:16}}>
            <GoogleLogin
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              onSuccess={async (credentialResponse) => {
                try {
                  const result = await loginWithGoogle(credentialResponse.credential);
                  navigate('/dashboard');
                  toast.success(`Selamat datang, ${result?.user?.name || 'Pengguna'}! 👋`);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Login Google gagal');
                }
              }}
              onError={() => toast.error('Login Google gagal, coba lagi')}
            />
          </div>
          <p style={{textAlign:'center',color:'rgba(255,255,255,0.25)',fontSize:13,margin:'16px 0 0'}}>
            Belum punya akun?{' '}
            <a href="/daftar" style={{color:'#fbbf24',fontWeight:700,textDecoration:'none'}}>Daftar gratis</a>
          </p>
          {canInstall && !isMobileDevice() && (
            <button type="button" onClick={promptInstall} className="btn-install" style={{marginTop:16}}>
              <Download size={15}/> Install Aplikasi
            </button>
          )}
          <p style={{textAlign:'center',color:'rgba(255,255,255,0.1)',fontSize:11,margin:'18px 0 0'}}>© 2025 KonterA · All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
