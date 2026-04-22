export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden dark:[background:radial-gradient(ellipse_80%_60%_at_50%_-10%,#2d1a5e_0%,#0f0d1a_55%,#080810_100%)] [background:radial-gradient(ellipse_80%_60%_at_50%_-10%,#ede9fe_0%,#f5f3ff_40%,#f8f8fc_100%)]">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-20 blur-[80px]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
      <div className="relative z-10 w-full flex items-center justify-center px-4">
        {children}
      </div>
    </div>
  )
}
