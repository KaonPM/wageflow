"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export function RoleGuard({ allowedRoles, children }: { allowedRoles:string[]; children:ReactNode }) {
  const router=useRouter(); const rolesKey=allowedRoles.join("|"); const[authorised,setAuthorised]=useState(false); const[message,setMessage]=useState("Checking your access…");
  useEffect(()=>{let active=true;(async()=>{const{data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/login");return;}const{data:profile,error}=await supabase.from("profiles").select("role, access_status").eq("id",user.id).maybeSingle();if(error||!profile){if(active)setMessage("We could not verify this account profile.");return;}const role=String(profile.role||"").trim().toLowerCase();const status=String(profile.access_status||"active").trim().toLowerCase();if(!rolesKey.split("|").includes(role)||!["active","approved"].includes(status)){await supabase.auth.signOut();setMessage("You do not have access to this area.");router.replace("/login");return;}if(active)setAuthorised(true);})();return()=>{active=false};},[rolesKey,router]);
  if(!authorised)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif",background:"#f8fafc",color:"#475569"}}><p>{message}</p></main>;
  return children;
}
