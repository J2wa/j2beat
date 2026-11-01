import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { AudioLines, Headphones, BookOpen, FolderOpen, Settings, ArrowUpRight, Menu, X, LogOut } from 'lucide-react';
export function Button({children, className = '', variant = 'secondary', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'text'}) {
  return <button type="button" {...props} className={`aces-button aces-button--${/(^| )bg-accent( |$)/.test(className) ? "primary" : variant} ${className}`}>{children}</button>;
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) { return <input {...props} ref={ref} />; });
export function SectionContainer({children, className = ''}: {children: ReactNode; className?: string}) { return <section className={`section-container ${className}`}>{children}</section>; }
export function Brand({onHome}:{onHome:()=>void}) { return <button type="button" className="aces-brand" onClick={onHome} aria-label="ACES Music studio"><span className="aces-mark" aria-hidden="true"><AudioLines size={22}/></span><span>ACES <span className="brand-subtitle">Music</span></span></button>; }

type View = 'workspace' | 'guidelines' | 'archive';
const nav = [{id:'workspace', label:'Studio', icon:AudioLines}, {id:'guidelines',label:'Guide',icon:BookOpen}, {id:'archive',label:'Library',icon:FolderOpen}] as const;
export function Header({view, onNavigate, onProfile}: {view: View; onNavigate:(view:View)=>void; onProfile:()=>void}) {
 const [open,setOpen]=useState(false);
 return <header className="app-header"><Brand onHome={()=>{onNavigate("workspace");setOpen(false);}} /><Button className="mobile-menu" aria-controls="app-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>} Menu</Button><nav id="app-navigation" className={open?'app-navigation is-open':'app-navigation'} aria-label="Main navigation">{nav.map(({id,label,icon:Icon})=><Button key={id} aria-current={view===id?'page':undefined} onClick={()=>{onNavigate(id);setOpen(false);}}><Icon/>{label}</Button>)}<Button onClick={onProfile}><Settings/>Profile</Button><Button onClick={()=>window.dispatchEvent(new Event("aces-signout"))}><LogOut/>Sign out</Button></nav></header>;
}
