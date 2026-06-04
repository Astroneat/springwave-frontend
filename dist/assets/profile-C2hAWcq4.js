import{d as e,o as t,p as n,u as r}from"./client-BwaAczyl.js";import{_ as i,a,c as o,d as s,f as c,g as l,i as u,l as d,n as f,o as p,p as m,r as h,s as g,t as _,u as v,y}from"./navbar-D3uvVBAW.js";import{n as b}from"./auth-BQ_RMGoG.js";document.addEventListener(`DOMContentLoaded`,async()=>{if(!e()){window.location.href=`/login.html`;return}await x(),await S(),await p(),await C(),await T(),L()});async function x(){await f({onFavouritesClick:F}),_()}async function S(){let e=await u(`./components/footer.html`);document.getElementById(`footer-container`).innerHTML=e}async function C(){let e=r();if(!e)return;try{let t=await b();t&&t.user&&(e=t.user)}catch{}if(I=e,document.getElementById(`profile-name`).textContent=e.username||e.fullname,document.getElementById(`profile-email`).textContent=e.email||`-`,document.getElementById(`profile-phone`).textContent=e.phoneNo||`-`,document.getElementById(`profile-username`).textContent=e.fullname||`-`,e.dob){let t=new Date(e.dob);document.getElementById(`profile-dob`).textContent=t.toLocaleDateString(`en-US`,{year:`numeric`,month:`long`,day:`numeric`})}e.school&&(document.getElementById(`profile-school`).textContent=e.school);let t={student:`Student`,host:`Host`,admin:`Admin`};document.getElementById(`profile-role`).textContent=t[e.role]||`Student`;let n=(e.username||e.fullname||`?`).charAt(0).toUpperCase();document.getElementById(`avatar-placeholder`).textContent=n,w(e)}function w(e){let t=document.getElementById(`edit-profile-btn`);t&&(e.dob&&e.school&&e.class&&e.major&&e.phoneNo?(t.innerHTML=`<i class="fa-regular fa-pen-to-square"></i> Edit Profile`,t.classList.remove(`complete`)):(t.innerHTML=`<i class="fa-regular fa-circle-check"></i> Complete Profile`,t.classList.add(`complete`)))}async function T(){let e=document.getElementById(`activity-list`),t=document.getElementById(`stats-count`);try{let{activities:n}=await s();if(e.innerHTML=``,!n||n.length===0){e.innerHTML=`<div class="empty-state">No participated activities yet.</div>`,t.textContent=`0`;return}t.textContent=n.length,n.forEach(t=>{let n=t.heldDate?new Date(t.heldDate).toLocaleDateString(`en-US`,{year:`numeric`,month:`short`,day:`numeric`}):`TBD`,r=document.createElement(`div`);r.className=`activity-card`,r.dataset.id=t.activityID,r.innerHTML=`
                <div class="activity-thumb">
                    ${t.thumbnail?`<img src="${t.thumbnail}" alt="${t.title}">`:`<i class="fa-regular fa-image"></i>`}
                </div>
                <div class="activity-body">
                    <div class="activity-meta">
                        <span class="activity-type">${h(t.type)}</span>
                        <span class="activity-date">${n}</span>
                    </div>
                    <div class="activity-title">${t.title}</div>
                    <div class="activity-location"><i class="fa-solid fa-location-dot"></i> ${t.location}</div>
                </div>
            `,r.addEventListener(`click`,()=>O(t.activityID)),e.appendChild(r)})}catch(t){console.error(`Load participated activities error:`,t),e.innerHTML=`<div class="empty-state">Failed to load activities.</div>`}}var E=document.getElementById(`popup-overlay`),D=document.getElementById(`popup-container`);async function O(t){if(!t||!E||!D)return;D.innerHTML=`<div class="popup-loading"><div class="spinner"></div></div>`,E.removeAttribute(`hidden`),E.classList.add(`active`),document.body.style.overflow=`hidden`;let{activity:n}=await l(t);D.innerHTML=N(n),M(t),document.getElementById(`back-btn`).addEventListener(`click`,k),e()&&Promise.all([m(t).then(({participated:e})=>{e&&A()}),d(t).then(({favourited:e})=>{e&&j()})]).catch(()=>{});let r=D.querySelector(`.favorite-btn`);r?.addEventListener(`click`,async e=>{e.stopPropagation();let n=r.classList.contains(`active`);try{n?(await c(t),r.classList.remove(`active`)):(await g(t),r.classList.add(`active`))}catch{}})}function k(){!E||!D||(E.classList.remove(`active`),document.body.style.overflow=``,setTimeout(()=>{D.innerHTML=``,E.setAttribute(`hidden`,``)},300))}E?.addEventListener(`click`,e=>{(e.target===E||e.target.classList.contains(`popup-backdrop`))&&k()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&k()});function A(){let e=document.querySelector(`.participate`);e&&(e.classList.add(`active`),e.querySelector(`.participate-header`).textContent=`PARTICIPATED`,e.querySelector(`.participate-text`).textContent=`You have joined in this activity`)}function j(){let e=document.querySelector(`.favorite-btn`);e&&e.classList.add(`active`)}function M(t){let n=document.querySelector(`.participate`);n&&n.addEventListener(`click`,async n=>{n.stopPropagation();let r=n.currentTarget,a=r.classList.contains(`active`);if(e())try{a?(await y(t),r.classList.remove(`active`),r.querySelector(`.participate-header`).textContent=`PARTICIPATE`,r.querySelector(`.participate-text`).textContent=`Join this activity`,P(t)):(await i(t),r.classList.add(`active`),r.querySelector(`.participate-header`).textContent=`PARTICIPATED`,r.querySelector(`.participate-text`).textContent=`You have joined in this activity`)}catch(e){console.error(`Participate error:`,e),r.querySelector(`.participate-text`).textContent=e.message||`Error`,setTimeout(()=>{r.querySelector(`.participate-text`).textContent=r.classList.contains(`active`)?`You have joined in this activity`:`Join this activity`},2e3)}})}function N(e){let n=a(e.heldDate),r=a(e.applicationDeadline),i=h(e.type),o=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`,s=(e.attachments||[]).map(e=>`<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div><h4>${decodeURIComponent(e.link.split(`/`).pop())}</h4></div>
            </div>
            <a class="download-btn" href="${t}/${e.link}" target="_blank"><i class="fa-solid fa-download"></i></a>
        </div>`).join(``);return`
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <div class="top-actions">
                <button class="icon-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
                <button class="favorite-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">Favourite</span></button>
            </div>
        </div>
        <div class="main-content">
            <div class="left-panel">
                <img src="${e.thumbnail||`https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop`}" alt="${e.title}">
                <div class="tag"><i class="fa-solid fa-tag"></i> ${i}</div>
                <div class="details-card">
                    <h2>Details</h2>
                    <div class="detail-item"><i class="fa-solid fa-location-dot"></i><div><span>Location</span><p>${e.location}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${n}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-user"></i><div><span>Host</span><p>${e.hostName||`Unknown`}</p></div></div>
                    <div class="detail-item"><i class="fa-regular fa-clock"></i><div><span>Apply deadline</span><p>${r}</p></div></div>
                    <div class="detail-item"><i class="fa-solid fa-tag"></i><div><span>Type</span><p>${i}</p></div></div>
                </div>
            </div>
            <div class="right-panel">
                <h1 class="title">${e.title}</h1>
                <a class="location-link" href="${o}" target="_blank"><i class="fa-solid fa-location-dot"></i> ${e.location}</a>
                <div class="info-boxes">
                    <div class="info-box"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${n}</p></div></div>
                    <div class="info-box"><i class="fa-regular fa-clock"></i><div><span>Apply deadline</span><p>${r}</p></div></div>
                    <div class="info-box"><i class="fa-regular fa-user"></i><div><span>Hosted by</span><p>${e.hostName||`Unknown`}</p></div></div>
                </div>
                <div class="description-panel">
                    ${(e.description||``).split(`
`).filter(e=>e.trim()).map(e=>`<p>${e}</p>`).join(``)}
                </div>
                ${s?`<div class="files-box"><h3>Attached Files (${(e.attachments||[]).length})</h3>${s}</div>`:``}
            </div>
        </div>
        <div class="action-buttons">
            <button class="action-btn discuss" type="button"><i class="fa-solid fa-comments"></i><div><h4>DISCUSS</h4><p>0 Comments</p></div></button>
            <button class="action-btn participate" type="button"><i class="fa-solid fa-users"></i><div><h4 class="participate-header">PARTICIPATE</h4><p class="participate-text">Join this activity</p></div></button>
            <button class="action-btn report" type="button"><i class="fa-solid fa-flag"></i><div><h4>REPORT</h4><p>Report this activity</p></div></button>
        </div>
    </div>`}function P(e){let t=document.querySelector(`.activity-card[data-id="${e}"]`);if(t){t.remove();let e=document.querySelectorAll(`.activity-card`).length;document.getElementById(`stats-count`).textContent=e,e===0&&(document.getElementById(`activity-list`).innerHTML=`<div class="empty-state">No participated activities yet.</div>`)}}async function F(){try{let{activities:e}=await v();D.innerHTML=`
            <div class="container">
                <div class="top-bar">
                    <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
                    <h2 class="fav-popup-title">Favourite Activities</h2>
                </div>
                <div class="fav-list">${(e||[]).map(e=>{let t=a(e.heldDate);return`<div class="fav-item" data-id="${e.activityID}">
                <div class="fav-thumb">${e.thumbnail?`<img src="${e.thumbnail}" alt="${e.title}">`:`<div class="fav-thumb-placeholder"><i class="fa-regular fa-image"></i></div>`}</div>
                <div class="fav-body"><div class="fav-title">${e.title}</div><div class="fav-location"><i class="fa-solid fa-location-dot"></i> ${e.location}</div><div class="fav-date">${t}</div></div>
            </div>`}).join(``)||`<p class="fav-empty">No favourites yet.</p>`}</div>
            </div>`,E.removeAttribute(`hidden`),E.classList.add(`active`),document.getElementById(`back-btn`).addEventListener(`click`,k),D.querySelectorAll(`.fav-item`).forEach(e=>{e.addEventListener(`click`,()=>O(e.dataset.id))})}catch{}}var I=null;function L(){let e=document.getElementById(`edit-profile-btn`),t=document.getElementById(`edit-modal`),n=document.getElementById(`edit-modal-close`),r=document.getElementById(`edit-btn-cancel`),i=document.getElementById(`edit-form`),a=t?.querySelector(`.edit-modal-backdrop`);!e||!t||(e.addEventListener(`click`,()=>R()),n?.addEventListener(`click`,z),r?.addEventListener(`click`,z),a?.addEventListener(`click`,z),i?.addEventListener(`submit`,B))}function R(){let e=I||r();if(!e)return;document.getElementById(`edit-fullname`).value=e.fullname||``,document.getElementById(`edit-dob`).value=e.dob?e.dob.split(`T`)[0]:``,document.getElementById(`edit-phone`).value=e.phoneNo||``,document.getElementById(`edit-school`).value=e.school||``,document.getElementById(`edit-class`).value=e.class||``,document.getElementById(`edit-major`).value=e.major||``;let t=document.getElementById(`edit-modal`);t.style.display=`flex`,t.classList.add(`active`),document.body.style.overflow=`hidden`}function z(){let e=document.getElementById(`edit-modal`);e.classList.remove(`active`),e.style.display=`none`,document.body.style.overflow=``;let t=document.querySelector(`.edit-form-status`);t&&t.remove()}async function B(e){e.preventDefault();let t=I||r();if(!t)return;let i=document.createElement(`div`);i.className=`edit-form-status`;let a=document.querySelector(`.edit-form-status`);a&&a.remove();let s={username:t.username,fullname:document.getElementById(`edit-fullname`).value.trim(),dob:document.getElementById(`edit-dob`).value,phoneNo:document.getElementById(`edit-phone`).value.trim(),school:document.getElementById(`edit-school`).value.trim(),className:document.getElementById(`edit-class`).value.trim(),major:document.getElementById(`edit-major`).value.trim()};if(!s.fullname||!s.dob||!s.school||!s.className||!s.major){i.className=`edit-form-status error`,i.textContent=`Please fill in all required fields.`,document.getElementById(`edit-form`).appendChild(i);return}i.className=`edit-form-status`,i.textContent=`Saving...`,document.getElementById(`edit-form`).appendChild(i);try{let e=await o(s);I=e.user,n(e.user),await C(),i.className=`edit-form-status success`,i.textContent=`Profile updated successfully!`,setTimeout(z,1200)}catch(e){i.className=`edit-form-status error`,i.textContent=e.message||`Failed to update profile.`}}