import"./DsnmJJEf.js";import{C as t,D as p,L as v,aH as A,E as T,F as I,aI as M,aJ as z,aK as B,a9 as F,a7 as L,J as y,I as g,P,a5 as j,aL as D,aM as f,p as J,a as E,b as O,aN as R,d as G,j as H,f as K,s as V,v as q,r as Q,i as w,u as U,aO as X}from"./BnC9fT8L.js";import{g as x,b as Y}from"./dkwyOqj7.js";import{e as Z,i as $}from"./L5kKxas4.js";import{B as ee}from"./C8xkIsTY.js";import{p as u,r as ae}from"./Bx5upNET.js";function te(h,e,b,n,_,k){let m=t;t&&p();var a=null;t&&v.nodeType===A&&(a=v,p());var r=t?v:h,o=new ee(r,!1);T(()=>{const s=e()||null;var i=D;if(s===null){o.ensure(null,null),f(!0);return}return o.ensure(s,c=>{if(s){if(a=t?a:M(s,i),z(a,a),n){var l=null;t&&B(s)&&a.append(l=document.createComment(""));var d=t?F(a):a.appendChild(L());t&&(d===null?y(!1):g(d)),n(a,d),l?.remove()}P.nodes.end=a,c.before(a)}t&&g(c)}),f(!0),()=>{s&&f(!1)}},I),j(()=>{f(!0)}),m&&(y(!0),g(r))}/**
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
 */const se={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var re=new Set(["$$slots","$$events","$$legacy","name","color","size","strokeWidth","absoluteStrokeWidth","iconNode","children"]),ne=R("<svg><!><!></svg>");function he(h,e){J(e,!0);const b=u(e,"color",3,"currentColor"),n=u(e,"size",3,24),_=u(e,"strokeWidth",3,2),k=u(e,"absoluteStrokeWidth",3,!1),m=u(e,"iconNode",19,()=>[]),a=ae(e,re);var r=ne();x(r,i=>({...se,...a,width:n(),height:n(),stroke:b(),"stroke-width":i,class:["lucide-icon lucide",e.name&&`lucide-${e.name}`,e.class]}),[()=>k()?Number(_())*24/Number(n()):_()]);var o=G(r);Z(o,17,m,$,(i,c)=>{var l=U(()=>X(w(c),2));let d=()=>w(l)[0],C=()=>w(l)[1];var N=H(),S=K(N);te(S,d,!0,(W,oe)=>{x(W,()=>({...C()}))}),E(i,N)});var s=V(o);Y(s,()=>e.children??q),Q(r),E(h,r),O()}export{he as I};
