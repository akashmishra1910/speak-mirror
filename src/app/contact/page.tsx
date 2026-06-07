import { Mail, MessageSquare } from "lucide-react";

const LinkedinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

export default function ContactPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-themeText dark:text-white">Let's Connect</h1>
          <p className="text-slate-650 dark:text-foreground/60 text-lg font-light leading-relaxed">
            Have questions, feedback, or want to collaborate? I'd love to hear from you.
          </p>
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-[2rem] dark:border-white/5 float-slow shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Email */}
            <a 
              href="mailto:teamclassiq@gmail.com" 
              className="flex flex-col items-center justify-center p-8 rounded-2xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/20 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] dark:border-white/5 dark:hover:border-white/10 transition-all group text-center float-slow interactive-card"
            >
              <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-650 dark:bg-white/5 dark:border-white/10 dark:text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-themeText dark:text-white">Email Me</h3>
              <p className="text-sm text-slate-500 dark:text-foreground/40 font-light">teamclassiq@gmail.com</p>
            </a>

            {/* LinkedIn */}
            <a 
              href="https://linkedin.com/in/akashmishra19" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 rounded-2xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/20 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] dark:border-white/5 dark:hover:border-white/10 transition-all group text-center float-fast interactive-card"
            >
              <div className="w-16 h-16 rounded-full bg-[#0A66C2]/5 border border-[#0A66C2]/20 text-[#0A66C2] flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(10,102,194,0.02)]">
                <LinkedinIcon />
              </div>
              <h3 className="font-bold text-lg mb-1 text-themeText dark:text-white">LinkedIn</h3>
              <p className="text-sm text-slate-500 dark:text-foreground/40 font-light">Connect with me professionally</p>
            </a>

          </div>
          
          <div className="mt-12 text-center text-sm text-slate-500 dark:text-foreground/30 flex items-center justify-center gap-2 font-light">
            <MessageSquare className="w-4 h-4" />
            Designed and built by Team ClassIQ
          </div>
        </div>
      </div>
    </div>
  );
}
