import { Mail, MessageSquare } from "lucide-react";

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const LinkedinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

export default function ContactPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Let's Connect</h1>
          <p className="text-foreground/60 text-lg">
            Have questions, feedback, or want to collaborate? I'd love to hear from you.
          </p>
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-surface-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Email */}
            <a 
              href="mailto:teamclassiq@gmail.com" 
              className="flex flex-col items-center justify-center p-8 rounded-2xl bg-surface/50 border border-surface-border hover:bg-surface transition-colors group text-center"
            >
              <div className="w-16 h-16 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-1">Email Me</h3>
              <p className="text-sm text-foreground/50">teamclassiq@gmail.com</p>
            </a>

            {/* GitHub */}
            <a 
              href="https://github.com/akashmishra1910" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 rounded-2xl bg-surface/50 border border-surface-border hover:bg-surface transition-colors group text-center"
            >
              <div className="w-16 h-16 rounded-full bg-foreground/5 text-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GithubIcon />
              </div>
              <h3 className="font-bold text-lg mb-1">GitHub</h3>
              <p className="text-sm text-foreground/50">@akashmishra1910</p>
            </a>

            {/* LinkedIn */}
            <a 
              href="https://linkedin.com/in/akashmishra1910" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-8 rounded-2xl bg-surface/50 border border-surface-border hover:bg-surface transition-colors group text-center md:col-span-2"
            >
              <div className="w-16 h-16 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LinkedinIcon />
              </div>
              <h3 className="font-bold text-lg mb-1">LinkedIn</h3>
              <p className="text-sm text-foreground/50">Connect with me professionally</p>
            </a>

          </div>
          
          <div className="mt-12 text-center text-sm text-foreground/40 flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Designed and built by Akash Mishra
          </div>
        </div>
      </div>
    </div>
  );
}
