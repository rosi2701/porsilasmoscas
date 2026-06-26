/* --------------------------------------------------
   data.js - carga el JSON desde el servidor y adapta
   los campos de TMDB al formato que usa app.js.
   Para agregar más series, solo reemplaza o amplía
   animated_series.json en el repositorio.
-------------------------------------------------- */

const IMG_BASE      = "https://image.tmdb.org/t/p/w300";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const COUNTRY_NAMES = {JP:"Japón", US:"EE. UU.", KR:"Corea", GB:"Reino Unido"};
const LANG_NAMES    = {ja:"Japonés", en:"Inglés", ko:"Coreano"};

/* Convierte un objeto crudo de TMDB al formato interno */
function adaptSerie(raw){
  const country = (raw.origin_country && raw.origin_country[0]) || "-";
  const year    = raw.first_air_date ? raw.first_air_date.slice(0,4) : "-";

  return {
    id          : raw.id,
    title       : raw.name || raw.original_name || "Sin título",
    country     : country,
    lang        : LANG_NAMES[raw.original_language] || raw.original_language || "-",
    year        : parseInt(year) || 0,
    rating      : parseFloat(raw.vote_average) || 0,
    votes       : parseInt(raw.vote_count) || 0,
    popularity  : parseFloat(raw.popularity) || 0,
    poster      : raw.poster_path    || "",
    backdrop    : raw.backdrop_path  || "",
    overview    : raw.overview       || "Sin descripción disponible.",
  };
}

/* DATA se llenará de forma asíncrona en app.js vía loadData() */
let DATA = [];

function loadData(){
  return fetch("animated_series.json")
    .then(r => {
      if(!r.ok) throw new Error("No se pudo cargar animated_series.json");
      return r.json();
    })
    .then(json => {
      /* El JSON puede ser un array directo o tener una propiedad "results" */
      const raw = Array.isArray(json) ? json : (json.results || []);
      DATA = raw.map(adaptSerie);
      return DATA;
    });
}