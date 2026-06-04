import{d as e,o as t}from"./client-BwaAczyl.js";import{_ as n,a as r,f as i,g as a,l as o,n as s,o as c,p as l,r as u,s as d,t as f,u as p,y as m}from"./navbar-D3uvVBAW.js";document.addEventListener(`DOMContentLoaded`,async()=>{await h(),await c(),_()});async function h(){await s({activeSection:`home`,onFavouritesClick:k}),f()}function g(){let e=document.querySelectorAll(`.nav-links a`);function t(t){e.forEach(e=>{e.classList.remove(`active`),e.dataset.section===t&&e.classList.add(`active`)})}let n=document.getElementById(`hero`),r=document.getElementById(`explore`);if(n&&r){let e=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.id===`hero`?t(`home`):e.target.id===`explore`&&t(`explore`))})},{threshold:.3});e.observe(n),e.observe(r)}}function _(){g()}var v=document.getElementById(`popup-overlay`),y=document.getElementById(`popup-container`),b=document.getElementById(`popup-overlay-2`),x=document.getElementById(`popup-container-2`);function S(e,t){let n=document.querySelector(`.card[data-id="${e}"]`);if(!n)return;let r=n.querySelector(`.star`);r&&r.classList.toggle(`active`,t)}function C(){v.classList.remove(`active`),document.body.style.overflow=``,setTimeout(()=>{y.innerHTML=``,v.setAttribute(`hidden`,``)},300)}function w(){b.classList.remove(`active`),setTimeout(()=>{x.innerHTML=``,b.setAttribute(`hidden`,``)},300)}async function T(t,n){if(!t)return;x.innerHTML=`<div class="popup-loading"><div class="spinner"></div></div>`,b.removeAttribute(`hidden`),b.classList.add(`active`);let r=n||(await a(t)).activity;if(!r)return;x.innerHTML=E(r,`Back`),j(t),x.querySelector(`#back-btn`)?.addEventListener(`click`,w),e()&&Promise.all([l(t).then(({participated:e})=>{e&&D()}),o(t).then(({favourited:e})=>{e&&O(t)})]).catch(()=>{});let s=x.querySelector(`.favorite-btn`);s?.addEventListener(`click`,async e=>{e.preventDefault(),e.stopPropagation();let n=s.classList.contains(`active`);try{n?(await i(t),s.classList.remove(`active`),S(t,!1)):(await d(t),s.classList.add(`active`),S(t,!0))}catch{}})}v?.addEventListener(`click`,e=>{(e.target===v||e.target.classList.contains(`popup-backdrop`))&&C()}),b?.addEventListener(`click`,e=>{(e.target===b||e.target.classList.contains(`popup-backdrop`))&&w()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&(C(),w())});function E(e,n){let i=r(e.heldDate),a=r(e.applicationDeadline),o=u(e.type),s=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`;n||=`Back`;let c=(e.attachments||[]).map(e=>`<div class="file-item">
            <div class="file-left">
                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                <div>
                    <h4>${decodeURIComponent(e.link.split(`/`).pop())}</h4>
                </div>
            </div>
            <a class="download-btn" href="${t}/${e.link}" target="_blank">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>`).join(``);return`
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn">
                <i class="fa-solid fa-arrow-left"></i>
                ${n}
            </button>
            <div class="top-actions">
                <button class="icon-btn">
                    <i class="fa-solid fa-share-nodes"></i>
                    Share
                </button>
                <button type="button" class="favorite-btn">
                    <div class="star"><i class="fa-solid fa-star"></i></div>
                    <span class="favorite-text">Favourite</span>
                </button>
            </div>
        </div>
        <div class="main-content">
            <div class="left-panel">
                <img src="${e.thumbnail||`https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop`}" alt="${e.title}">
                <div class="tag"><i class="fa-solid fa-tag"></i> ${o}</div>
                <div class="details-card">
                    <h2>Details</h2>
                    <div class="detail-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <div><span>Location</span><p>${e.location}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-calendar"></i>
                        <div><span>Date</span><p>${i}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-user"></i>
                        <div><span>Host</span><p>${e.hostName||`Unknown`}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-regular fa-clock"></i>
                        <div><span>Apply deadline</span><p>${a}</p></div>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-tag"></i>
                        <div><span>Type</span><p>${o}</p></div>
                    </div>
                </div>
            </div>
            <div class="right-panel">
                <h1 class="title">${e.title}</h1>
                <a class="location-link" href="${s}" target="_blank">
                    <i class="fa-solid fa-location-dot"></i>
                    ${e.location}
                </a>
                <div class="info-boxes">
                    <div class="info-box">
                        <i class="fa-regular fa-calendar"></i>
                        <div><span>Date</span><p>${i}</p></div>
                    </div>
                    <div class="info-box">
                        <i class="fa-regular fa-clock"></i>
                        <div><span>Apply deadline</span><p>${a}</p></div>
                    </div>
                    <div class="info-box">
                        <i class="fa-regular fa-user"></i>
                        <div><span>Hosted by</span><p>${e.hostName||`Unknown`}</p></div>
                    </div>
                </div>
                <div class="description-panel">
                    ${(e.description||``).split(`
`).filter(e=>e.trim()).map(e=>`<p>${e}</p>`).join(``)}
                </div>
                ${c?`
                <div class="files-box">
                    <h3>Attached Files (${(e.attachments||[]).length})</h3>
                    ${c}
                </div>`:``}
            </div>
        </div>
        <div class="action-buttons">
            <button class="action-btn discuss" type="button">
                <i class="fa-solid fa-comments"></i>
                <div><h4>DISCUSS</h4><p>0 Comments</p></div>
            </button>
            <button class="action-btn participate" type="button">
                <i class="fa-solid fa-users"></i>
                <div><h4 class="participate-header">PARTICIPATE</h4><p class="participate-text">Join this activity</p></div>
            </button>
            <button class="action-btn report" type="button">
                <i class="fa-solid fa-flag"></i>
                <div><h4>REPORT</h4><p>Report this activity</p></div>
            </button>
        </div>
    </div>`}function D(){let e=document.querySelector(`.participate`);e&&(e.classList.add(`active`),e.querySelector(`.participate-header`).textContent=`PARTICIPATED`,e.querySelector(`.participate-text`).textContent=`You have joined in this activity`)}function O(e){let t=document.querySelector(`.favorite-btn`);t&&t.classList.add(`active`),S(e,!0)}async function k(){if(!e()){window.location.href=`/login.html`;return}try{let{activities:e}=await p();y.innerHTML=A(e||[]),v.removeAttribute(`hidden`),v.classList.add(`active`),document.body.style.overflow=`hidden`,y.querySelector(`#back-btn`)?.addEventListener(`click`,C);let t=y.querySelectorAll(`.activity-card-fav`);e.forEach((e,n)=>{t[n]?.addEventListener(`click`,()=>{T(e.activityID,e)})})}catch{}}function A(e){return e.length===0?`<div class="container fav-empty-container"><p class="fav-empty">No favourites yet.</p></div>`:`
    <div class="container">
        <div class="top-bar">
            <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <h2 class="fav-popup-title">Favourite Activities</h2>
        </div>
        <div class="fav-list">${e.map(e=>{let t=r(e.heldDate),n=u(e.type);return`
        <div class="activity-card-fav" data-id="${e.activityID}">
            <div class="card-thumb">
                ${e.thumbnail?`<img src="${e.thumbnail}" alt="${e.title}">`:`<div class="card-thumb-placeholder"><i class="fa-regular fa-image"></i></div>`}
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-type-badge">${n}</span>
                    <span class="card-date">${t}</span>
                </div>
                <h3 class="card-title">${e.title}</h3>
                <div class="card-location"><i class="fa-solid fa-location-dot"></i> ${e.location}</div>
            </div>
        </div>`}).join(``)}</div>
    </div>`}function j(t){let r=document.querySelector(`.participate`);r&&r.addEventListener(`click`,async r=>{r.stopPropagation();let i=r.currentTarget,a=i.classList.contains(`active`);if(e())try{a?(await m(t),i.classList.remove(`active`),i.querySelector(`.participate-header`).textContent=`PARTICIPATE`,i.querySelector(`.participate-text`).textContent=`Join this activity`):(await n(t),i.classList.add(`active`),i.querySelector(`.participate-header`).textContent=`PARTICIPATED`,i.querySelector(`.participate-text`).textContent=`You have joined in this activity`)}catch(e){console.error(`Participate error:`,e),i.querySelector(`.participate-text`).textContent=e.message||`Error`,setTimeout(()=>{i.querySelector(`.participate-text`).textContent=i.classList.contains(`active`)?`You have joined in this activity`:`Join this activity`},2e3)}})}