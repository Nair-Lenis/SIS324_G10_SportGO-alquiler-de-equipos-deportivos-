// seed-equipos.js — Corre con:  node seed-equipos.js
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'sportgo.db'));

const propietario = db.prepare("SELECT id FROM users WHERE email='ana@sportgo.com'").get();
if (!propietario) {
  console.error('❌ Usuario propietario no encontrado. Iniciá el servidor al menos una vez primero.');
  process.exit(1);
}
const pid = propietario.id;

const equipos = [
  // ── CICLISMO (5) ──────────────────────────────────────────────────────────
  {
    titulo:      'Bicicleta MTB Trek Marlin 7 29"',
    descripcion: 'Mountain bike hardtail 29", talla M, componentes Shimano Deore 12v. Ideal para rutas de montaña en Chacaltaya y Valle de la Luna. Incluye casco, portabidón y bomba de mano.',
    categoria:   'Ciclismo',
    precio_dia:  120,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80',
    ],
  },
  {
    titulo:      'Bicicleta de Ruta Specialized Allez 105',
    descripcion: 'Bicicleta de ruta en aluminio talla 54cm, grupo Shimano 105 11v. Perfecta para el circuito costero del Titicaca y la carretera Los Yungas.',
    categoria:   'Ciclismo',
    precio_dia:  95,
    ubicacion:   'Copacabana, Bolivia',
    lat: -16.1667, lng: -69.0833,
    fotos: [
      'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=800&q=80',
    ],
  },
  {
    titulo:      'Bicicleta Eléctrica Cube Reaction Hybrid',
    descripcion: 'E-bike con motor Bosch Performance 250W, autonomía 80 km en modo ECO. Ideal para explorar Santa Cruz sin cansancio. Cargador incluido.',
    categoria:   'Ciclismo',
    precio_dia:  150,
    ubicacion:   'Santa Cruz, Bolivia',
    lat: -17.7833, lng: -63.1822,
    fotos: [
      'https://images.unsplash.com/photo-1623040933067-24e52b77dfbb?w=800&q=80',
    ],
  },
  {
    titulo:      'Kit Downhill Completo — Bicicleta + Protecciones',
    descripcion: 'Bicicleta DH Santa Cruz V10, casco full-face Fox Proframe, rodilleras y coderas Troy Lee. Las pistas de Zongo Valley te esperan.',
    categoria:   'Ciclismo',
    precio_dia:  200,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
    ],
  },
  {
    titulo:      'Bicicleta de Touring Surly Long Haul Trucker',
    descripcion: 'Bicicleta de viaje en acero cromo-molibdeno, alforjas delanteras y traseras incluidas, portabidón doble. Perfecta para la ruta Sucre–Potosí.',
    categoria:   'Ciclismo',
    precio_dia:  100,
    ubicacion:   'Sucre, Bolivia',
    lat: -19.0478, lng: -65.2586,
    fotos: [
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
    ],
  },

  // ── ACUÁTICO (5) ──────────────────────────────────────────────────────────
  {
    titulo:      'Kayak Dúo Ocean Malibu II — Lago Titicaca',
    descripcion: 'Kayak tándem 12 pies, ideal para explorar las islas del Lago Titicaca. Incluye 2 chalecos salvavidas, remos y falda de neopreno.',
    categoria:   'Acuático',
    precio_dia:  130,
    ubicacion:   'Copacabana, Bolivia',
    lat: -16.1667, lng: -69.0833,
    fotos: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800&q=80',
    ],
  },
  {
    titulo:      'Paddleboard SUP Aqua Marina Fusion 10\'2"',
    descripcion: 'Tabla SUP inflable con bomba de doble acción, remo ajustable de fibra de vidrio y mochila de transporte. Perfecta para el Lago Titicaca.',
    categoria:   'Acuático',
    precio_dia:  90,
    ubicacion:   'Copacabana, Bolivia',
    lat: -16.1500, lng: -69.0900,
    fotos: [
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80',
    ],
  },
  {
    titulo:      'Tabla de Surf Longboard 9\' + Traje de Neopreno',
    descripcion: 'Tabla longboard 9 pies con leash y quillas FCS, más traje de neopreno 3/2 mm. Para los ríos Ichilo y Chapare de Cochabamba.',
    categoria:   'Acuático',
    precio_dia:  110,
    ubicacion:   'Cochabamba, Bolivia',
    lat: -17.3895, lng: -66.1568,
    fotos: [
      'https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?w=800&q=80',
    ],
  },
  {
    titulo:      'Equipo Completo de Snorkel y Buceo',
    descripcion: 'Máscara de vista panorámica, aletas de silicona, tubo seco y traje de neopreno 3 mm. Ideal para explorar la fauna submarina del Lago Titicaca.',
    categoria:   'Acuático',
    precio_dia:  60,
    ubicacion:   'Copacabana, Bolivia',
    lat: -16.1667, lng: -69.0833,
    fotos: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    ],
  },
  {
    titulo:      'Bote Inflable Zodiac 4 Personas — Ríos del Beni',
    descripcion: 'Bote neumático resistente para 4 personas con remos de aluminio y kit de reparación. Perfecto para recorrer los ríos del Beni y el Mamoré.',
    categoria:   'Acuático',
    precio_dia:  200,
    ubicacion:   'Rurrenabaque, Bolivia',
    lat: -14.4444, lng: -67.5278,
    fotos: [
      'https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&q=80',
    ],
  },

  // ── INVIERNO (5) ──────────────────────────────────────────────────────────
  {
    titulo:      'Tabla Snowboard Burton Custom X 158 cm',
    descripcion: 'Snowboard freeride 158 cm con fijaciones Burton Step On. Canto afilado y wax reciente. Para las pistas nevadas de Chacaltaya (4600 m.s.n.m.).',
    categoria:   'Invierno',
    precio_dia:  95,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.3500, lng: -68.1200,
    fotos: [
      'https://images.unsplash.com/photo-1483389127117-b6a2102724ae?w=800&q=80',
      'https://images.unsplash.com/photo-1548133464-5e99a7decd3d?w=800&q=80',
    ],
  },
  {
    titulo:      'Esquís Alpinos Rossignol Experience 84 — 170 cm',
    descripcion: 'Esquís 170 cm con fijaciones Look SPX 12. Nivel intermedio-avanzado. Aptos para las pistas de Chacaltaya y el cerro Tunari.',
    categoria:   'Invierno',
    precio_dia:  110,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.3500, lng: -68.1200,
    fotos: [
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80',
    ],
  },
  {
    titulo:      'Kit Completo de Ski — Traje + Botas + Gafas',
    descripcion: 'Mono térmico talla L/XL, botas Salomon talla 27.0, gafas Oakley Flight Deck. Todo lo que necesitás para disfrutar la nieve boliviana sin comprar nada.',
    categoria:   'Invierno',
    precio_dia:  140,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.3500, lng: -68.1200,
    fotos: [
      'https://images.unsplash.com/photo-1545959570-a94084071b5d?w=800&q=80',
    ],
  },
  {
    titulo:      'Raquetas de Nieve Atlas Helium + Bastones',
    descripcion: 'Raquetas de nieve talla ajustable 35–44, más bastones de aluminio plegables. Para excursiones invernales en el volcán Sajama o el Nevado Illimani.',
    categoria:   'Invierno',
    precio_dia:  55,
    ubicacion:   'Oruro, Bolivia',
    lat: -17.9667, lng: -67.1000,
    fotos: [
      'https://images.unsplash.com/photo-1543370776-c02a8d008191?w=800&q=80',
    ],
  },
  {
    titulo:      'Casco + Gafas de Ski Premium Giro + Smith',
    descripcion: 'Casco Giro Ratio talla M con ventilación regulable, gafas Smith Squad con lente intercambiable S3/S1. Protección UV400 certificada.',
    categoria:   'Invierno',
    precio_dia:  40,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1612688098573-71f4b8cddb89?w=800&q=80',
    ],
  },

  // ── TRAIL / SENDERISMO (5) ────────────────────────────────────────────────
  {
    titulo:      'Mochila Trekking Osprey Atmos AG 65 L',
    descripcion: 'Mochila 65 L con sistema anti-gravedad, cubierta de lluvia y bolsillo de hidratación. Perfecta para el Camino del Inca, el Choro Trail o el Yunga Cruz.',
    categoria:   'Trail/Senderismo',
    precio_dia:  45,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    ],
  },
  {
    titulo:      'Carpa Ultraligera MSR Hubba Hubba NX 2P',
    descripcion: 'Carpa 2 personas, doble capa, peso 1.7 kg, resistente al viento y lluvia. Ideal para las 3 noches del Choro Trail o el Camino Precolombino Takesi.',
    categoria:   'Trail/Senderismo',
    precio_dia:  70,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    ],
  },
  {
    titulo:      'Botas de Trekking Salomon X Ultra 4 Gore-Tex',
    descripcion: 'Botas talla 42, membrana waterproof Gore-Tex, suela Contagrip MA. Aptas para terrenos mixtos del altiplano y los Yungas. Perfectas para el Camino Takesi.',
    categoria:   'Trail/Senderismo',
    precio_dia:  35,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    ],
  },
  {
    titulo:      'Kit de Navegación GPS Garmin + Primeros Auxilios',
    descripcion: 'GPS Garmin inReach Mini con comunicación satelital, brújula Suunto A-10, silbato y botiquín de primeros auxilios. Esencial para rutas largas en Los Yungas.',
    categoria:   'Trail/Senderismo',
    precio_dia:  50,
    ubicacion:   'Coroico, Bolivia',
    lat: -16.1833, lng: -67.7167,
    fotos: [
      'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
    ],
  },
  {
    titulo:      'Bastones de Senderismo Black Diamond Distance FLZ',
    descripcion: 'Par de bastones de carbono plegables FlickLock, 200 g por unidad. Ideales para el Camino Precolombino Takesi y el Yunga Cruz de 4 días.',
    categoria:   'Trail/Senderismo',
    precio_dia:  25,
    ubicacion:   'La Paz, Bolivia',
    lat: -16.4897, lng: -68.1193,
    fotos: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
    ],
  },
];

const insert = db.prepare(`
  INSERT INTO equipos (propietario_id, titulo, descripcion, categoria, precio_dia, ubicacion, lat, lng, fotos, estado_val)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprobado')
`);

const insertAll = db.transaction(() => {
  for (const eq of equipos) {
    insert.run(
      pid,
      eq.titulo,
      eq.descripcion,
      eq.categoria,
      eq.precio_dia,
      eq.ubicacion,
      eq.lat,
      eq.lng,
      JSON.stringify(eq.fotos),
    );
  }
});

insertAll();
console.log(`✅ ${equipos.length} equipos insertados correctamente (estado: aprobado).`);
console.log('   5 × Ciclismo | 5 × Acuático | 5 × Invierno | 5 × Trail/Senderismo');
db.close();
