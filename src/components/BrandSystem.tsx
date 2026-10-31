import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { AudioLines, BookOpen, FolderOpen, Settings, ArrowUpRight, Menu, X } from 'lucide-react';
export function Button({children, className = '', variant = 'secondary', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'text'}) {
  return <button type="button" {...props} className={`aces-button aces-button--${/(^| )bg-accent( |$)/.test(className) ? "primary" : variant} ${className}`}>{children}</button>;
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) { return <input {...props} ref={ref} />; });
export function SectionContainer({children, className = ''}: {children: ReactNode; className?: string}) { return <section className={`section-container ${className}`}>{children}</section>; }
export function Brand() { return <a className="aces-brand" href="https://acesintelligence.xyz" aria-label="ACES Intelligence home"><span className="aces-mark" aria-hidden="true">A.</span><span>ACES<span className="brand-subtitle">MUSIC</span></span></a>; }
type View = 'workspace' | 'guidelines' | 'archive';
const nav = [{id:'workspace', label:'Workspace', icon:AudioLines}, {id:'guidelines',label:'Guidelines',icon:BookOpen}, {id:'archive',label:'Archive',icon:FolderOpen}] as const;
export function Header({view, onNavigate, onProfile}: {view: View; onNavigate:(view:View)=>void; onProfile:()=>void}) {
 const [open,setOpen]=useState(false);
 return <header className="app-header"><Brand /><Button className="mobile-menu" aria-controls="app-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>} Menu</Button><nav id="app-navigation" className={open?'app-navigation is-open':'app-navigation'} aria-label="Main navigation">{nav.map(({id,label,icon:Icon})=><Button key={id} aria-current={view===id?'page':undefined} onClick={()=>{onNavigate(id);setOpen(false);}}><Icon/>{label}</Button>)}<Button onClick={onProfile}><Settings/>Profile</Button></nav></header>;
}
export function Footer({onNavigate}:{onNavigate:(view:View)=>void}) { return <footer className="app-footer"><div><Brand/><p>Music annotation. Human perspective.</p></div><nav aria-label="Footer navigation">{nav.map(({id,label,icon:Icon})=><Button key={id} onClick={()=>{onNavigate(id);window.scrollTo({top:0,behavior:'instant'});}}><Icon/>{label}</Button>)}<a className="aces-button aces-button--secondary" href="https://acesintelligence.xyz"><ArrowUpRight/>ACES Intelligence</a></nav><p className="footer-note">© {new Date().getFullYear()} ACES Intelligence · Review AI-generated annotations before use.</p></footer>; }
