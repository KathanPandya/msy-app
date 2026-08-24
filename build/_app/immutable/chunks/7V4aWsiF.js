import"./DsnmJJEf.js";import{l as a,m as y,A as g,aw as W,q as z,E as T,ax as B,aa as F,P as M,z as x,y as v,F as P,ag as I,ay as R,p as j,a as q,c as D,f as G,s as L,h as O,r as V,g as w,u as H,az as J}from"./DJQfozXV.js";import{g as K,a as E,h as Q,c as U}from"./D_pQkl8g.js";import{g as N,b as X}from"./B2bdp_H0.js";import{e as Y,i as Z}from"./C24eX9hi.js";import{a as f}from"./DxSaZQU4.js";import{i as $}from"./BiFF_jB9.js";import{B as ee}from"./Dik01S6n.js";import{p as c,r as te}from"./D9wdwvrv.js";function ae(m,e,k,o,h,p){let _=a;a&&y();var t=null;a&&g.nodeType===W&&(t=g,y());var s=a?g:m,n=new ee(s,!1);z(()=>{const r=e()||null;var i=R;if(r===null){n.ensure(null,null),f(!0);return}return n.ensure(r,u=>{if(r){if(t=a?t:B(r,i),K(t,t),o){var l=null;a&&$(r)&&t.append(l=document.createComment(""));var d=a?F(t):t.appendChild(M());a&&(d===null?x(!1):v(d)),o(t,d),l?.remove()}P.nodes.end=t,u.before(t)}a&&v(u)}),f(!0),()=>{r&&f(!1)}},T),I(()=>{f(!0)}),_&&(x(!0),v(s))}/**
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
 */const re={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var se=new Set(["$$slots","$$events","$$legacy","name","color","size","strokeWidth","absoluteStrokeWidth","iconNode","children"]),oe=Q("<svg><!><!></svg>");function ge(m,e){j(e,!0);const k=c(e,"color",3,"currentColor"),o=c(e,"size",3,24),h=c(e,"strokeWidth",3,2),p=c(e,"absoluteStrokeWidth",3,!1),_=c(e,"iconNode",19,()=>[]),t=te(e,se);var s=oe();N(s,i=>({...re,...t,width:o(),height:o(),stroke:k(),"stroke-width":i,class:["lucide-icon lucide",e.name&&`lucide-${e.name}`,e.class]}),[()=>p()?Number(h())*24/Number(o()):h()]);var n=D(s);Y(n,17,_,Z,(i,u)=>{var l=H(()=>J(w(u),2));let d=()=>w(l)[0],S=()=>w(l)[1];var b=U(),A=G(b);ae(A,d,!0,(C,ne)=>{N(C,()=>({...S()}))}),E(i,b)});var r=L(n);X(r,()=>e.children??O),V(s),E(m,s),q()}export{ge as I};
