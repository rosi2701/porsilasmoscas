function formatVotes(n){
  if(n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,'') + "K";
  return String(n);
}

function ratingTier(r){
  if(r >= 8.75) return "Sobresaliente";
  if(r >= 8.65) return "Excelente";
  return "Muy bueno";
}

const TIER_COLOR = {"Sobresaliente":"#F7B955","Excelente":"#DD4F9B","Muy bueno":"#7C5CC9"};
const TIER_ORDER = ["Excelente","Muy bueno","Sobresaliente"];

const starIconActive = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const infoIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
const shareIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const starOutline = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

const favorites = new Set();
const hidden = new Set();
let heroIndex = 0;
let heroPool = [];

// --- Variables maestras para los filtros ---
let currentSearch = "";
let currentCountry = "all";
let currentSort = "rating";
let showOnlyFavs = false;

function renderKPIs(){
  const total = DATA.length;
  const avg = (DATA.reduce((s,d)=>s+d.rating,0)/total).toFixed(2);
  const totalVotes = DATA.reduce((s,d)=>s+d.votes,0);
  const counts = {};
  DATA.forEach(d=>counts[d.country]=(counts[d.country]||0)+1);
  const topCountry = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];

  const kpis = [
    {label:"Series analizadas", value:total, sub:"con 500+ votos registrados"},
    {label:"Calificación promedio", value:avg, sub:"sobre 10 puntos"},
    {label:"Votos totales", value:formatVotes(totalVotes), sub:"acumulados en TMDB"},
    {label:"País líder", value:COUNTRY_NAMES[topCountry[0]], sub:`${topCountry[1]} de ${total} series`}
  ];

  document.getElementById('kpis').innerHTML = kpis.map(k=>`
    <div class="kpi-card">
      <p class="kpi-label">${k.label}</p>
      <p class="kpi-value">${k.value}</p>
      <p class="kpi-sub">${k.sub}</p>
    </div>
  `).join('');
}

function renderDonut(){
  const counts = {"Excelente":0,"Muy bueno":0,"Sobresaliente":0};
  DATA.forEach(d=>counts[ratingTier(d.rating)]++);
  document.getElementById('donutTotal').textContent = DATA.length;

  const ctx = document.getElementById('donutChart');
  new Chart(ctx, {
    type:'doughnut',
    data:{
      labels: TIER_ORDER,
      datasets:[{
        data: TIER_ORDER.map(t=>counts[t]),
        backgroundColor: TIER_ORDER.map(t=>TIER_COLOR[t]),
        borderWidth:0,
        hoverOffset:6
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'72%',
      plugins:{ legend:{display:false}, tooltip:{
        callbacks:{ label:(c)=> ` ${c.label}: ${c.raw} series` }
      }},
      animation:{ animateRotate:true, duration:900 }
    }
  });

  document.getElementById('donutLegend').innerHTML = TIER_ORDER.map(t=>`
    <div class="legend-item">
      <span class="legend-dot" style="background:${TIER_COLOR[t]}"></span>
      ${t} (${counts[t]})
    </div>
  `).join('');
}

function renderArea(){
  const sorted = [...DATA].sort((a,b)=>b.rating-a.rating);
  const ratingMin = Math.min(...sorted.map(d=>d.rating));
  const ratingMax = Math.max(...sorted.map(d=>d.rating));
  const popMax = Math.max(...sorted.map(d=>d.popularity));

  const ratingScaled = sorted.map(d => Math.round(((d.rating - ratingMin) / (ratingMax - ratingMin)) * 100));
  const popScaled = sorted.map(d => Math.round((d.popularity / popMax) * 100));

  const ctx = document.getElementById('areaChart');
  new Chart(ctx, {
    type:'line',
    data:{
      labels: sorted.map((d,i)=>i+1),
      datasets:[
        {
          label:'Calificación (escala)',
          data: ratingScaled,
          borderColor:'#DD4F9B',
          backgroundColor:'rgba(221,79,155,0.18)',
          fill:true, tension:0.4, pointRadius:0, borderWidth:2.5
        },
        {
          label:'Popularidad (escala)',
          data: popScaled,
          borderColor:'#7C5CC9',
          backgroundColor:'rgba(124,92,201,0.18)',
          fill:true, tension:0.4, pointRadius:0, borderWidth:2.5
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:11} } },
        tooltip:{
          callbacks:{
            title:(items)=> sorted[items[0].dataIndex].title
          }
        }
      },
      scales:{
        x:{ title:{display:true,text:'Posición en el ranking',font:{size:10.5}}, grid:{display:false}, ticks:{font:{size:10}} },
        y:{ display:false, min:0, max:110 }
      }
    }
  });
}

function renderHero(){
  const d = heroPool[heroIndex];
  const bgUrl = d.backdrop ? (BACKDROP_BASE + d.backdrop) : (IMG_BASE + d.poster);
  document.getElementById('heroBg').style.backgroundImage = `url('${bgUrl}')`;
  document.getElementById('heroTitle').textContent = d.title;
  document.getElementById('heroRating').textContent = d.rating.toFixed(1);
}

document.getElementById('heroPrev').addEventListener('click', ()=>{
  heroIndex = (heroIndex - 1 + heroPool.length) % heroPool.length;
  renderHero();
});

document.getElementById('heroNext').addEventListener('click', ()=>{
  heroIndex = (heroIndex + 1) % heroPool.length;
  renderHero();
});

document.getElementById('heroCta').addEventListener('click', ()=>{
  document.getElementById('grid').scrollIntoView({ behavior:'smooth', block:'start' });
});

function cardTemplate(d, idx){
  const tier = ratingTier(d.rating);
  const isFav = favorites.has(d.id);
  return `
    <article class="show-card" style="animation-delay:${Math.min(idx*0.04,0.5)}s" data-id="${d.id}">
      <div class="show-poster-wrap">
        <img src="${IMG_BASE + d.poster}" alt="${d.title}" loading="lazy">
        <span class="rating-badge">${starIconActive.replace('<svg ', '<svg width="11" height="11" ')} ${d.rating.toFixed(1)}</span>
        <span class="country-badge">${d.country}</span>
      </div>
      <div class="show-body">
        <p class="show-title">${d.title}</p>
        <p class="show-meta">${d.year} · ${formatVotes(d.votes)} votos · ${tier}</p>
        <p class="show-overview">${d.overview}</p>
        <div class="show-actions">
          <div class="mini-btn fav ${isFav ? 'active' : ''}" title="Favorito" data-action="fav">${starOutline}</div>
          <div class="mini-btn" title="Más información" data-action="info">${infoIcon}</div>
          <div class="mini-btn" title="Ver en TMDB" data-action="share">${shareIcon}</div>
          <div class="mini-btn" title="Quitar de la vista" data-action="remove">${closeIcon}</div>
        </div>
      </div>
    </article>
  `;
}

// --- Nueva función centralizada para aplicar todos los filtros ---
function applyFilters() {
  // 1. Filtrar los datos
  let filtered = DATA.filter(d => {
    // Si la ocultó el usuario con la X
    if (hidden.has(d.id)) return false;
    // Si estamos viendo solo favoritos
    if (showOnlyFavs && !favorites.has(d.id)) return false;
    // Filtro de País
    if (currentCountry !== "all" && d.country !== currentCountry) return false;
    // Buscador de texto
    if (currentSearch && !d.title.toLowerCase().includes(currentSearch)) return false;
    
    return true;
  });

  // 2. Ordenar los datos resultantes
  filtered.sort((a,b) => {
    if(currentSort === 'rating') return b.rating - a.rating;
    if(currentSort === 'popularity') return b.popularity - a.popularity;
    if(currentSort === 'recent') return b.year - a.year;
    return 0;
  });

  // 3. Actualizar el texto del contador
  const totalFound = filtered.length;
  // Cortamos el array para mostrar un máximo de 20 tarjetas
  const visible = filtered.slice(0, 20);
  
  document.getElementById('resultCount').textContent = `Mostrando ${visible.length} de ${totalFound} series`;

  // 4. Inyectar al HTML
  const gridEl = document.getElementById('grid');
  if(visible.length === 0){
    gridEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👻</div>
        <h4>Sin resultados</h4>
        <p>Prueba escribiendo otro nombre o cambiando los filtros superiores.</p>
      </div>`;
    return;
  }
  
  gridEl.innerHTML = visible.map((d,i)=>cardTemplate(d,i)).join('');
}

// --- Listeners para el Buscador y los Filtros ---

document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearch = e.target.value.toLowerCase();
  applyFilters();
});

document.getElementById('countryChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#countryChips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  currentCountry = chip.dataset.country;
  applyFilters();
});

document.getElementById('favFilterBtn').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  btn.classList.toggle('active');
  showOnlyFavs = btn.classList.contains('active');
  applyFilters();
});

document.getElementById('sortChips').addEventListener('click', (e)=>{
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#sortChips .chip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  currentSort = chip.dataset.sort;
  applyFilters();
});

document.getElementById('grid').addEventListener('click', (e)=>{
  const btn = e.target.closest('.mini-btn');
  if(!btn) return;
  const card = btn.closest('.show-card');
  const id = Number(card.dataset.id);
  const action = btn.dataset.action;

  if(action === 'fav'){
    if(favorites.has(id)){ 
      favorites.delete(id); 
      btn.classList.remove('active'); 
      if(showOnlyFavs) applyFilters(); // Si está en la pestaña favoritos, lo desaparece al instante
    }
    else { 
      favorites.add(id); 
      btn.classList.add('active'); 
    }
  }
  if(action === 'info'){
    card.classList.toggle('expanded');
  }
  if(action === 'share'){
    window.open(`https://www.themoviedb.org/tv/${id}`, '_blank');
  }
  if(action === 'remove'){
    hidden.add(id);
    card.style.transition = 'opacity .2s ease';
    card.style.opacity = '0';
    setTimeout(applyFilters, 180);
  }
});

// --- Inicialización final ---
loadData().then(() => {
  heroPool = [...DATA].sort((a,b)=>b.rating-a.rating).slice(0,5);
  const loadingState = document.getElementById('loadingState');
  if(loadingState) loadingState.classList.add('hidden');

  renderKPIs();
  renderDonut();
  renderArea();
  renderHero();
  applyFilters(); // Reemplazamos renderGrid() por applyFilters() para aplicar límite de inicio
}).catch(err => {
  console.error("Error al cargar los datos:", err);
});
