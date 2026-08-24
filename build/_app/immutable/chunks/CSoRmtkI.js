import"./DsnmJJEf.js";import{p,f as c,h as d,a as m}from"./DJQfozXV.js";import{c as l,a as h}from"./D_pQkl8g.js";import{b as f}from"./B2bdp_H0.js";import{s as u,r as b}from"./D9wdwvrv.js";import{I as w}from"./7V4aWsiF.js";import{i as n}from"./DN_5Iyxv.js";var g=new Set(["$$slots","$$events","$$legacy"]);function E(o,a){p(a,!0);/**
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
 */let t=b(a,g);const s=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}],["circle",{cx:"9",cy:"7",r:"4"}]];w(o,u({name:"users"},()=>t,{get iconNode(){return s},children:(e,x)=>{var r=l(),i=c(r);f(i,()=>a.children??d),h(e,r)},$$slots:{default:!0}})),m()}class v{async getDashboardStats(){return(await n.get("api/admin/get-dashboard-stats")).data}async downloadBackup(){try{const a=await n.get("api/admin/export/backup",{responseType:"blob"}),e=a.headers["content-disposition"]?.match(/filename="?([^"]+)"?/)?.[1]??`bhattmevada-backup-${new Date().toISOString().slice(0,10)}.xlsx`;return{blob:a.data,filename:e}}catch(a){const t=a?.response?.data;if(t instanceof Blob)try{const s=JSON.parse(await t.text());throw new Error(s.message||"Failed to download backup")}catch(s){if(s instanceof Error&&!s.message.includes("JSON"))throw s}throw new Error(a?.response?.statusText||a?.message||"Failed to download backup")}}}const I=new v;export{E as U,I as d};
