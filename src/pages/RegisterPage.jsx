import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle, User, Lock, Store, MapPin, Phone, ChevronRight, ChevronLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';

const STEPS = ['Info Akun', 'Info Toko'];

export default function RegisterPage() {
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState({ name:'', username:'', password:'', confirmPassword:'', namaToko:'', alamat:'', telepon:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nextStep = () => {
    if (!form.name || !form.username || !form.password) return toast.error('Semua field wajib diisi!');
    if (form.password.length < 6) return toast.error('Password minimal 6 karakter!');
    if (form.password !== form.confirmPassword) return toast.error('Password tidak cocok!');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.namaToko) return toast.error('Nama toko wajib diisi!');
    setLoading(true);
    try {
      const { data } = await api.post('/owner/register', {
        name: form.name, username: form.username, password: form.password,
        namaToko: form.namaToko, alamat: form.alamat, telepon: form.telepon,
      });
      localStorage.setItem('token', data.token);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registrasi gagal');
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
        @keyframes checkPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        .lp{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:52px 56px;position:relative;z-index:1;overflow:hidden;min-height:0}
        .rp{width:440px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:32px 36px;position:relative;z-index:1;overflow-y:auto}
        .ri{width:100%;box-sizing:border-box;padding:13px 16px 13px 42px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.11);border-radius:13px;color:#fff;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s,background .2s,box-shadow .2s}
        .ri::placeholder{color:rgba(255,255,255,0.24)}
        .ri:focus{background:rgba(37,99,235,0.1);border-color:rgba(59,130,246,0.65);box-shadow:0 0 0 4px rgba(37,99,235,0.12)}
        .ri:-webkit-autofill,.ri:-webkit-autofill:focus{-webkit-text-fill-color:white!important;-webkit-box-shadow:0 0 0 1000px #0d0520 inset!important}
        .ri-plain{width:100%;box-sizing:border-box;padding:13px 16px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.11);border-radius:13px;color:#fff;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .2s,background .2s,box-shadow .2s;resize:none}
        .ri-plain::placeholder{color:rgba(255,255,255,0.24)}
        .ri-plain:focus{background:rgba(37,99,235,0.1);border-color:rgba(59,130,246,0.65);box-shadow:0 0 0 4px rgba(37,99,235,0.12)}
        .btn-next{width:100%;padding:14px;border:none;border-radius:13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14.5px;font-weight:700;color:white;cursor:pointer;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 45%,#7c3aed 100%);box-shadow:0 6px 28px rgba(37,99,235,0.35);transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden}
        .btn-next:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 36px rgba(37,99,235,0.5)}
        .btn-next:disabled{opacity:.6;cursor:not-allowed}
        .btn-back{width:100%;padding:14px;border:1px solid rgba(255,255,255,0.12);border-radius:13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14.5px;font-weight:600;color:rgba(255,255,255,0.6);cursor:pointer;background:rgba(255,255,255,0.04);transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-back:hover{background:rgba(255,255,255,0.08);color:white}
        .fcard{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:13px 16px}
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
            <span style={{color:'rgba(147,197,253,0.9)',fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase'}}>Daftar Gratis Sekarang</span>
          </div>

          <h1 style={{fontSize:50,fontWeight:800,lineHeight:1.12,margin:'0 0 18px',letterSpacing:'-1.5px',background:'linear-gradient(135deg,#fff 20%,rgba(147,197,253,0.9) 55%,rgba(234,179,8,0.85) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Mulai Kelola<br/>Konter Anda<br/>Hari Ini
          </h1>

          <p style={{color:'rgba(255,255,255,0.38)',fontSize:14,lineHeight:1.8,maxWidth:350,margin:'0 0 28px'}}>
            Daftar dalam 2 menit, langsung bisa digunakan. Tidak perlu kartu kredit, tidak ada biaya tersembunyi.
          </p>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {e:'✅',t:'Setup cepat 2 menit',d:'Isi data akun dan toko, langsung aktif'},
              {e:'🆓',t:'Gratis untuk dicoba',d:'Nikmati semua fitur tanpa batas di awal'},
              {e:'🔒',t:'Data aman & terlindungi',d:'Enkripsi penuh, backup otomatis setiap hari'},
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

          {/* Marquee */}
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
          {[['Gratis','Daftar'],['2 Menit','Setup'],['Langsung','Aktif']].map(([v,l])=>(
            <div key={l}>
              <div style={{fontSize:24,fontWeight:800,color:'white',letterSpacing:'-0.5px'}}>{v}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'1px',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rp">
        <Toaster position="top-center" toastOptions={{
          style:{borderRadius:14,fontSize:'13.5px',fontWeight:600,background:'rgba(15,5,35,0.96)',color:'white',border:'1px solid rgba(255,255,255,0.12)',backdropFilter:'blur(16px)',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:99999},
          error:{iconTheme:{primary:'#f87171',secondary:'rgba(15,5,35,0.96)'}},
          success:{iconTheme:{primary:'#4ade80',secondary:'rgba(15,5,35,0.96)'}},
        }}/>

        <div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,0.055)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderRadius:28,border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 32px 80px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.08)',padding:'36px 32px'}}>

          {/* Logo di card */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
            <div style={{borderRadius:12,overflow:'hidden',boxShadow:'0 2px 10px rgba(37,99,235,0.25)',flexShrink:0}}>
              <img src="/Logo_KonterA.png" alt="KonterA" style={{height:36,display:'block',objectFit:'contain'}}
                onError={e=>{e.target.parentElement.style.display='none'}}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'white',lineHeight:1}}>KonterA</div>
              <div style={{fontSize:9,fontWeight:700,color:'rgba(234,179,8,0.8)',letterSpacing:'2px',textTransform:'uppercase',marginTop:2}}>POS System</div>
            </div>
          </div>

          {/* Step indicator */}
          {step < 3 && (
            <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:24}}>
              {STEPS.map((s,i)=>(
                <React.Fragment key={i}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,
                      background:step>i+1?'#22c55e':step===i+1?'linear-gradient(135deg,#2563eb,#7c3aed)':'rgba(255,255,255,0.08)',
                      color:step>=i+1?'white':'rgba(255,255,255,0.3)',
                      boxShadow:step===i+1?'0 4px 12px rgba(37,99,235,0.4)':'none',
                    }}>
                      {step>i+1?'✓':i+1}
                    </div>
                    <div style={{fontSize:10,fontWeight:600,color:step===i+1?'rgba(147,197,253,0.9)':'rgba(255,255,255,0.25)',whiteSpace:'nowrap'}}>{s}</div>
                  </div>
                  {i<1&&<div style={{flex:1,height:1,background:step>i+1?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.08)',margin:'0 8px',marginBottom:18}}/>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* STEP 1 */}
          {step===1&&(
            <div>
              <h2 style={{color:'white',fontSize:22,fontWeight:800,margin:'0 0 4px'}}>Buat Akun</h2>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,margin:'0 0 20px'}}>Isi informasi akun administrator</p>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Nama Lengkap</label>
                  <div style={{position:'relative'}}>
                    <User size={14} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)'}}/>
                    <input type="text" className="ri" placeholder="Nama lengkap Anda" value={form.name} onChange={e=>set('name',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Username</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)',fontSize:13,fontWeight:700}}>@</span>
                    <input type="text" className="ri" placeholder="username unik" value={form.username} onChange={e=>set('username',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Password</label>
                  <div style={{position:'relative'}}>
                    <Lock size={14} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)'}}/>
                    <input type={showPw?'text':'password'} className="ri" style={{paddingRight:44}} placeholder="Min. 6 karakter" value={form.password} onChange={e=>set('password',e.target.value)}/>
                    <button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.28)',display:'flex',padding:4}}>
                      {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Konfirmasi Password</label>
                  <div style={{position:'relative'}}>
                    <Lock size={14} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)'}}/>
                    <input type="password" className="ri" placeholder="Ulangi password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}/>
                  </div>
                </div>
                <button className="btn-next" onClick={nextStep} style={{marginTop:4}}>Lanjut <ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step===2&&(
            <div>
              <h2 style={{color:'white',fontSize:22,fontWeight:800,margin:'0 0 4px'}}>Info Toko</h2>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,margin:'0 0 20px'}}>Data toko/konter Anda</p>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Nama Toko *</label>
                  <div style={{position:'relative'}}>
                    <Store size={14} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)'}}/>
                    <input type="text" className="ri" placeholder="Contoh: Galaxy Cell" value={form.namaToko} onChange={e=>set('namaToko',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>Alamat <span style={{color:'rgba(255,255,255,0.2)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(opsional)</span></label>
                  <div style={{position:'relative'}}>
                    <MapPin size={14} style={{position:'absolute',left:14,top:14,color:'rgba(255,255,255,0.25)'}}/>
                    <textarea className="ri-plain" style={{paddingLeft:42,paddingTop:13,height:76,lineHeight:1.6}} placeholder="Alamat toko" value={form.alamat} onChange={e=>set('alamat',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',color:'rgba(255,255,255,0.4)',fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:7}}>No. Telepon <span style={{color:'rgba(255,255,255,0.2)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(opsional)</span></label>
                  <div style={{position:'relative'}}>
                    <Phone size={14} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.25)'}}/>
                    <input type="tel" className="ri" placeholder="08xxxxxxxxxx" value={form.telepon} onChange={e=>set('telepon',e.target.value)}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:10,marginTop:4}}>
                  <button className="btn-back" onClick={()=>setStep(1)}><ChevronLeft size={16}/> Kembali</button>
                  <button className="btn-next" onClick={handleSubmit} disabled={loading}>
                    {loading?<><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/>Mendaftar...</>:<>Daftar <ChevronRight size={16}/></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 - Sukses */}
          {step===3&&(
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{animation:'checkPop .6s cubic-bezier(.22,1,.36,1) both',display:'inline-block',marginBottom:20}}>
                <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(34,197,94,0.15)',border:'2px solid rgba(34,197,94,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
                  <CheckCircle size={36} color="#4ade80"/>
                </div>
              </div>
              <h2 style={{color:'white',fontSize:22,fontWeight:800,margin:'0 0 8px'}}>Akun Berhasil Dibuat! 🎉</h2>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:13.5,lineHeight:1.7,margin:'0 0 28px'}}>
                Selamat datang di KonterA!<br/>Toko Anda sudah siap digunakan.
              </p>
              <button className="btn-next" onClick={()=>navigate('/dashboard')}>
                Masuk ke Dashboard <ChevronRight size={16}/>
              </button>
            </div>
          )}

          {step<3&&(
            <>
              <div style={{display:'flex',alignItems:'center',gap:10,margin:'20px 0 0'}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}}/><span style={{color:'rgba(255,255,255,0.18)',fontSize:11}}>atau</span><div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}}/>
              </div>
              <p style={{textAlign:'center',color:'rgba(255,255,255,0.25)',fontSize:13,margin:'14px 0 0'}}>
                Sudah punya akun?{' '}
                <a href="/login" style={{color:'#fbbf24',fontWeight:700,textDecoration:'none'}}>Masuk</a>
              </p>
            </>
          )}
          <p style={{textAlign:'center',color:'rgba(255,255,255,0.1)',fontSize:11,margin:'18px 0 0'}}>© 2025 KonterA · All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
