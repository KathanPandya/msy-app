import"../chunks/DsnmJJEf.js";import{p as A,j as O,f as P,v as T,a as x,b as N,m as J,d as i,r as s,s as k,t as I,e as S,q as K,c as H,i as a,u as F,h as Q,x as C,l as W,g as q}from"../chunks/CaZ788I_.js";import{s as R,a as V}from"../chunks/8v73LAvO.js";import{b as B,a as j,s as X}from"../chunks/Xux9A6ZV.js";import{s as Y,r as Z,i as U}from"../chunks/DE_Vg-kH.js";import{p as z}from"../chunks/BAafCNW5.js";import{t as b,w as $}from"../chunks/Bylaf3bX.js";import{a as D}from"../chunks/CYvQ7HBz.js";import{L as ee,H as ae,r as te}from"../chunks/CW9Oxsmi.js";import{f as re}from"../chunks/X0a0Jg9A.js";import{h as se,i as ie}from"../chunks/CxuO1t6C.js";import{e as oe}from"../chunks/BiymchfP.js";import{c as le}from"../chunks/Cbmqc44T.js";import{I as ne}from"../chunks/d13hVP2O.js";import{I as me}from"../chunks/CaXmNu0G.js";import{s as de}from"../chunks/1id1xQex.js";var ce=new Set(["$$slots","$$events","$$legacy"]);function fe(y,e){A(e,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let n=Z(e,ce);const u=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{cx:"12",cy:"7",r:"4"}]];me(y,Y({name:"user"},()=>n,{get iconNode(){return u},children:(v,l)=>{var m=O(),d=P(m);B(d,()=>e.children??T),x(v,m)},$$slots:{default:!0}})),N()}var ue=H('<span class="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"> </span>'),ve=H('<header class="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-1.5"><div class="mx-auto flex max-w-3xl items-center justify-between"><div class="flex items-center gap-1.5"><p class="text-sm font-semibold text-gray-900"> </p> <!></div> <button type="button" class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"><!></button></div></header>');function ge(y,e){A(e,!0);var n=ve(),u=i(n),v=i(u),l=i(v),m=i(l,!0);s(l);var d=k(l,2);{var t=c=>{var g=ue(),p=i(g,!0);s(g),I(_=>S(p,_),[()=>b(e.lang,"head")]),x(c,g)};U(d,c=>{e.isHead&&c(t)})}s(v);var r=k(v,2),w=i(r);ee(w,{class:"h-4 w-4"}),s(r),s(u),s(n),I((c,g,p)=>{S(m,c),j(r,"aria-label",g),j(r,"title",p)},[()=>b(e.lang,"greeting").replace("{name}",e.firstName),()=>b(e.lang,"logOut"),()=>b(e.lang,"logOut")]),K("click",r,()=>D.logout()),x(y,n),N()}J(["click"]);var pe=H('<a><!> <span class="text-[9px] font-medium leading-tight"> </span></a>'),he=H('<nav class="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center" aria-label="Primary"><div class="relative"><div class="absolute inset-0 -z-10 scale-110 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 opacity-50 blur-xl"></div> <div class="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/60 bg-white/25 p-1 shadow-[0_8px_24px_rgba(31,41,110,0.18),inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-xl backdrop-saturate-200"></div></div></nav>');function be(y,e){A(e,!0);const n=[{key:"home",href:"/me",icon:ae,label:()=>b(e.lang,"home")},{key:"payments",href:"/me/payments",icon:ne,label:()=>b(e.lang,"payments")},{key:"profile",href:"/me/profile",icon:fe,label:()=>b(e.lang,"profile")}];var u=he(),v=i(u),l=k(i(v),2);oe(l,21,()=>n,m=>m.key,(m,d)=>{const t=F(()=>e.active===a(d).key);var r=pe(),w=i(r);{let p=F(()=>a(t)?2.25:2);le(w,()=>a(d).icon,(_,o)=>{o(_,{class:"h-4 w-4",get strokeWidth(){return a(p)}})})}var c=k(w,2),g=i(c,!0);s(c),s(r),I((p,_)=>{j(r,"href",p),j(r,"aria-current",a(t)?"page":void 0),X(r,1,`flex flex-col items-center gap-0 rounded-full px-4 py-1.5 transition-colors ${a(t)?"bg-blue-600/90 text-white shadow-sm":"text-gray-700 hover:bg-white/40"}`),S(g,_)},[()=>$(e.lang,a(d).href),()=>a(d).label()]),x(m,r)}),s(l),s(v),s(u),x(y,u),N()}var xe=H('<div class="flex min-h-screen items-center justify-center bg-gray-50"><p class="text-sm text-gray-600"> </p></div>'),ye=H('<div class="relative flex h-full flex-col bg-gray-50"><!> <main class="min-h-0 flex-1 overflow-y-auto px-3 pt-1.5 pb-24"><div class="mx-auto max-w-3xl space-y-2"><!></div></main> <!></div>');function Oe(y,e){A(e,!0);const n=()=>V(D,"$authStore",u),[u,v]=R(),l=F(()=>z.params.lang);let m=q(!1),d=q("");const t=Q({isHead:!1,familyMembers:[],isLoadingFamily:!1});de(t),C(()=>{n().isLoading||W(m,te(a(l)),!0)});const r=F(()=>n().userAllInfo?.user);C(()=>{const o=a(r)?._id;if(!o||a(d)===o)return;W(d,o,!0);const f=se(o);if(f){t.familyMembers=f.family?.members??[],t.isHead=f.family?.isHead??!1;return}t.isLoadingFamily=!0,re.me().then(h=>{ie(o,h),t.familyMembers=h.family?.members??[],t.isHead=h.family?.isHead??!1}).catch(()=>{t.familyMembers=[],t.isHead=!1}).finally(()=>{t.isLoadingFamily=!1})});const w=F(()=>z.url.pathname.endsWith("/payments")?"payments":z.url.pathname.endsWith("/profile")?"profile":"home");var c=O(),g=P(c);{var p=o=>{var f=xe(),h=i(f),M=i(h,!0);s(h),s(f),I(L=>S(M,L),[()=>b(a(l),"loading")]),x(o,f)},_=o=>{var f=ye(),h=i(f);ge(h,{get firstName(){return a(r).first_name},get isHead(){return t.isHead},get lang(){return a(l)}});var M=k(h,2),L=i(M),E=i(L);B(E,()=>e.children??T),s(L),s(M);var G=k(M,2);be(G,{get active(){return a(w)},get lang(){return a(l)}}),s(f),x(o,f)};U(g,o=>{n().isLoading?o(p):a(m)&&a(r)&&o(_,1)})}x(y,c),N(),v()}export{Oe as component};
