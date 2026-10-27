/* ============================================================
   1. ELEMENTOS DE LA INTERFAZ Y DATOS GENERALES
   ============================================================ */
const canvas = document.getElementById("juego");
const ctx = canvas.getContext("2d");
const arena = document.querySelector(".arena");

const inicio = document.getElementById("inicio");
const lobby = document.getElementById("lobby");
const menuMandos = document.getElementById("menuMandos");
const partida = document.getElementById("partida");
const seleccionMapa = document.getElementById("seleccionMapa");
const pantallaHabilidades = document.getElementById("pantallaHabilidades");
const estado = document.getElementById("estado");
const mensajeLobby = document.getElementById("mensajeLobby");

const nombresColores = [
    "rojo", "negro", "verde", "azul", "amarillo", "rosa", "celeste"
];

const coloresHex = {
    rojo: "#ff3d5a",
    negro: "#28354d",
    verde: "#28f08a",
    azul: "#168cff",
    amarillo: "#ffe640",
    rosa: "#ff4fd8",
    celeste: "#48e8ff"
};

const configuraciones = [
    { figura: "circulo", color: "rojo" },
    { figura: "triangulo", color: "negro" },
    { figura: "cuadrado", color: "verde" }
];

let jugadores = [];
let proyectiles = [];
let teclas = {};
let indiceMandoActivo = 0;
let indiceConfiguracionActivo = 0;
// Cada modalidad se asigna a un solo jugador y se puede intercambiar desde el menu.
let mandos = ["wasd", "flechas", "mouse"];
let jugadoresActivos = [true, true, true];
let habilidadesHabilitadas = [];
const nombresHabilidades = { escudo:"Escudo de energía", turbo:"Turbo", curacion:"Reparación", impulso:"Impulso", triple:"Disparo triple", potencia:"Impacto potente", invisibilidad:"Fase fantasma", precision:"Precisión" };

let controlesActivos = true;
let mousePresionado = false;
let dispersion = [5, 5, 5];
let juegoTerminado = false;
let mensajeFinal = "";

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let contadorCuadro = 0;
let ultimoTiempoFrame = 0;
let fondoArenaCache = null;
let anchoFondoCache = 0;
let altoFondoCache = 0;

/* ============================================================
   2. CONFIGURACION DEL LOBBY Y VISTAS PREVIAS
   ============================================================ */
function obtenerSelector(tipo, indice) {
    return document.getElementById(tipo + (indice + 1));
}

function actualizarFigura(indice) {
    configuraciones[indice].figura =
        obtenerSelector("figura", indice).value;

    dibujarVista(indice);
}

function actualizarColor(indice) {
    const selector = obtenerSelector("color", indice);
    let colorElegido = selector.value;

    const repetido = configuraciones.some((jugador, i) =>
        i !== indice && jugador.color === colorElegido
    );

    if (repetido) {
        const colorDisponible = nombresColores.find(color =>
            !configuraciones.some((jugador, i) =>
                i !== indice && jugador.color === color
            )
        );

        if (colorDisponible) {
            colorElegido = colorDisponible;
            selector.value = colorDisponible;
        }
    }

    configuraciones[indice].color = colorElegido;

    actualizarColores();
    dibujarVista(indice);
    actualizarMensajeLobby();
}

function actualizarColores() {
    for (let i = 0; i < 3; i++) {
        const selector = obtenerSelector("color", i);

        const coloresDeOtros = configuraciones
            .filter((jugador, indice) => indice !== i)
            .map(jugador => jugador.color);

        Array.from(selector.options).forEach(opcion => {
            opcion.disabled =
                coloresDeOtros.includes(opcion.value) &&
                opcion.value !== selector.value;
        });
    }
}

function actualizarMensajeLobby() {
    const coloresElegidos = configuraciones.map(jugador => jugador.color);
    const sinRepetir = new Set(coloresElegidos).size === 3;

    if (sinRepetir) {
        mensajeLobby.textContent = "";
        mensajeLobby.classList.remove("visible");
    } else {
        mensajeLobby.textContent = "Los colores no pueden repetirse.";
        mensajeLobby.classList.add("visible");
    }
}

function ajustarCanvas() {
    const rect = arena.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;

    const alturaAnterior = canvas.height;
    const nuevaAltura = Math.max(300, Math.round(canvas.width * rect.height / rect.width));
    if (nuevaAltura === alturaAnterior) return;

    const proporcion = nuevaAltura / alturaAnterior;
    canvas.height = nuevaAltura;

    for (const jugador of jugadores) {
        jugador.y *= proporcion;
        if (jugador.destinoY !== null) jugador.destinoY *= proporcion;
        jugador.direccionY *= proporcion;
        const magnitud = Math.hypot(jugador.direccionX, jugador.direccionY) || 1;
        jugador.direccionX /= magnitud;
        jugador.direccionY /= magnitud;
        jugador.y = Math.max(34, Math.min(canvas.height - 34, jugador.y));
    }

    for (const proyectil of proyectiles) {
        proyectil.y *= proporcion;
        proyectil.vy *= proporcion;
    }

    mouseY *= proporcion;
}

function dibujarVista(indice) {
    const vista = document.getElementById("vista" + (indice + 1));
    const vistaCtx = vista.getContext("2d");
    const configuracion = configuraciones[indice];
    const entradaNombre = document.getElementById("nombre" + (indice + 1));
    const nombre = (entradaNombre.value.trim() || "Jugador " + (indice + 1)).slice(0, 18);
    const color = coloresHex[configuracion.color] || "#55eaff";

    vistaCtx.clearRect(0, 0, vista.width, vista.height);

    const fondo = vistaCtx.createLinearGradient(0, 0, vista.width, vista.height);
    fondo.addColorStop(0, "#0b1831");
    fondo.addColorStop(0.5, "#11172e");
    fondo.addColorStop(1, "#211039");
    vistaCtx.fillStyle = fondo;
    vistaCtx.fillRect(0, 0, vista.width, vista.height);

    const aura = vistaCtx.createRadialGradient(42, 47, 2, 42, 47, 43);
    aura.addColorStop(0, color + "b8");
    aura.addColorStop(0.42, color + "35");
    aura.addColorStop(1, color + "00");
    vistaCtx.fillStyle = aura;
    vistaCtx.fillRect(0, 0, vista.width, vista.height);

    vistaCtx.strokeStyle = "#9ddfff22";
    vistaCtx.lineWidth = 1;
    for (let x = 8; x < vista.width; x += 18) {
        vistaCtx.beginPath();
        vistaCtx.moveTo(x, 0);
        vistaCtx.lineTo(x, vista.height);
        vistaCtx.stroke();
    }

    const destellos = [[12, 17], [69, 13], [65, 78], [163, 16], [166, 78], [101, 86]];
    for (let i = 0; i < destellos.length; i++) {
        vistaCtx.beginPath();
        vistaCtx.arc(destellos[i][0], destellos[i][1], i % 2 === 0 ? 1.3 : 0.8, 0, Math.PI * 2);
        vistaCtx.fillStyle = i % 2 === 0 ? "#a8fbff" : "#f9aaff";
        vistaCtx.shadowColor = vistaCtx.fillStyle;
        vistaCtx.shadowBlur = 6;
        vistaCtx.fill();
    }
    vistaCtx.shadowBlur = 0;

    vistaCtx.save();
    vistaCtx.translate(42, 47);

    // Halo y contorno exterior de la figura.
    vistaCtx.save();
    vistaCtx.scale(1.22, 1.22);
    vistaCtx.strokeStyle = color;
    vistaCtx.lineWidth = 1.3;
    vistaCtx.globalAlpha = 0.55;
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 19;
    trazarFigura(vistaCtx, configuracion.figura, 22);
    vistaCtx.stroke();
    vistaCtx.restore();

    const relleno = vistaCtx.createLinearGradient(-16, -20, 18, 21);
    relleno.addColorStop(0, "#ffffff");
    relleno.addColorStop(0.19, color);
    relleno.addColorStop(1, color);
    vistaCtx.fillStyle = relleno;
    vistaCtx.strokeStyle = "#f4fbff";
    vistaCtx.lineWidth = 2;
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 22;
    trazarFigura(vistaCtx, configuracion.figura, 21);
    vistaCtx.fill();
    vistaCtx.shadowBlur = 0;
    vistaCtx.stroke();
    vistaCtx.restore();

    vistaCtx.textAlign = "left";
    vistaCtx.textBaseline = "middle";
    vistaCtx.fillStyle = "#f7fbff";
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 10;
    vistaCtx.font = "800 14px Segoe UI, Arial";
    vistaCtx.fillText(nombre, 78, 34, 94);
    vistaCtx.shadowBlur = 0;

    const nombresFiguras = {
        circulo: "Círculo", triangulo: "Triángulo", cuadrado: "Cuadrado",
        rombo: "Rombo", pentagono: "Pentágono", hexagono: "Hexágono",
        heptagono: "Heptágono", octagono: "Octágono"
    };
    vistaCtx.fillStyle = "#c2d6f2";
    vistaCtx.font = "12px Segoe UI, Arial";
    vistaCtx.fillText(nombresFiguras[configuracion.figura] || configuracion.figura, 78, 53, 94);

    // Línea luminosa de acento bajo la información del jugador.
    const linea = vistaCtx.createLinearGradient(78, 0, 164, 0);
    linea.addColorStop(0, color);
    linea.addColorStop(1, color + "00");
    vistaCtx.fillStyle = linea;
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 8;
    vistaCtx.fillRect(78, 70, 82, 2);
    vistaCtx.shadowBlur = 0;

    vistaCtx.fillStyle = color;
    vistaCtx.beginPath();
    vistaCtx.arc(82, 81, 2.1, 0, Math.PI * 2);
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 7;
    vistaCtx.fill();
    vistaCtx.shadowBlur = 0;

    vistaCtx.strokeStyle = color + "99";
    vistaCtx.lineWidth = 1;
    vistaCtx.shadowColor = color;
    vistaCtx.shadowBlur = 8;
    vistaCtx.strokeRect(0.75, 0.75, vista.width - 1.5, vista.height - 1.5);
    vistaCtx.shadowBlur = 0;
}

/* ============================================================
   3. DIBUJO DE FIGURAS GEOMETRICAS
   ============================================================ */
function trazarFigura(contexto, figura, tamano) {
    contexto.beginPath();

    if (figura === "circulo") {
        contexto.arc(0, 0, tamano, 0, Math.PI * 2);
        return;
    }

    if (figura === "ovalo") {
        contexto.ellipse(0, 0, tamano * 1.3, tamano * 0.72, 0, 0, Math.PI * 2);
        return;
    }

    if (figura === "cuadrado") {
        contexto.rect(-tamano, -tamano, tamano * 2, tamano * 2);
        return;
    }

    if (figura === "rombo") {
        contexto.moveTo(0, -tamano * 1.25);
        contexto.lineTo(tamano * 0.82, 0);
        contexto.lineTo(0, tamano * 1.25);
        contexto.lineTo(-tamano * 0.82, 0);
        contexto.closePath();
        return;
    }

    const lados = {
        triangulo: 3,
        "triangulo-acutangulo": 3,
        "triangulo-obtusangulo": 3,
        "triangulo-escaleno": 3,
        "triangulo-isosceles": 3,
        "triangulo-oblicuo": 3,
        pentagono: 5,
        hexagono: 6,
        heptagono: 7,
        octagono: 8
    };
    const cantidad = lados[figura] || 3;
    const inicio = -Math.PI / 2;

    for (let i = 0; i < cantidad; i++) {
        const angulo = inicio + (Math.PI * 2 * i / cantidad);
        const x = Math.cos(angulo) * tamano;
        const y = Math.sin(angulo) * tamano;
        if (i === 0) contexto.moveTo(x, y);
        else contexto.lineTo(x, y);
    }
    contexto.closePath();
}

/* ============================================================
   4. NAVEGACION Y ASIGNACION DE MANDOS
   ============================================================ */
const descripcionesMandos = {
    wasd: "Mover: W, A, S, D · Disparar: Q · Habilidad: E.",
    flechas: "Mover: flechas del teclado · Disparar: Shift derecho · Habilidad: Enter.",
    mouse: "Mover: clic izquierdo o arrastrar · Disparar: clic derecho · Habilidad: rueda arriba."
};

function mostrarPantalla(pantalla) {
    [inicio, lobby, menuMandos, pantallaHabilidades, seleccionMapa, partida].forEach(seccion => {
        seccion.classList.add("oculto");
    });
    pantalla.classList.remove("oculto");

    document.body.classList.remove("en-inicio", "en-mandos", "en-lobby", "en-habilidades", "en-mapas", "en-partida");
    if (pantalla === inicio) document.body.classList.add("en-inicio");
    if (pantalla === menuMandos) document.body.classList.add("en-mandos");
    if (pantalla === lobby) document.body.classList.add("en-lobby");
    if (pantalla === pantallaHabilidades) document.body.classList.add("en-habilidades");
    if (pantalla === seleccionMapa) document.body.classList.add("en-mapas");
    if (pantalla === partida) document.body.classList.add("en-partida");
}

function abrirConfiguracion() {
    mostrarPantalla(lobby);
    actualizarMensajeLobby();
}

function abrirMenuMandos() {
    actualizarVistaMandos();
    mostrarPantalla(menuMandos);
}

function volverInicio() {
    mostrarPantalla(inicio);
    document.body.classList.remove("en-partida");
    teclas = {};
    mousePresionado = false;
    controlesActivos = true;
    juegoTerminado = false;
    mensajeFinal = "";
}

function contenidoVisualMando(mando) {
    if (mando === "wasd") {
        return `
            <div class="teclado-demo" aria-label="Teclas W A S D para moverse">
                <div class="fila-teclas"><kbd class="tecla-demo">W</kbd></div>
                <div class="fila-teclas"><kbd class="tecla-demo">A</kbd><kbd class="tecla-demo">S</kbd><kbd class="tecla-demo">D</kbd></div>
            </div>
            <div class="accion-teclado">
                <span class="etiqueta-accion">DISPARAR</span>
                <kbd class="tecla-demo ataque">Q</kbd>
                <small>MOVER: WASD</small>
                <span class="etiqueta-accion">HABILIDAD</span><kbd class="tecla-demo">E</kbd>
            </div>`;
    }

    if (mando === "flechas") {
        return `
            <div class="teclado-demo" aria-label="Flechas para moverse">
                <div class="fila-teclas"><kbd class="tecla-demo">↑</kbd></div>
                <div class="fila-teclas"><kbd class="tecla-demo">←</kbd><kbd class="tecla-demo">↓</kbd><kbd class="tecla-demo">→</kbd></div>
            </div>
            <div class="accion-teclado">
                <span class="etiqueta-accion">DISPARAR</span>
                <kbd class="tecla-demo ataque larga">SHIFT DER.</kbd>
                <small>MOVER: FLECHAS</small>
                <span class="etiqueta-accion">HABILIDAD</span><kbd class="tecla-demo larga">ENTER</kbd>
            </div>`;
    }

    return `
        <div class="raton-demo" aria-label="Mouse: izquierda mover, derecha disparar">
            <span class="zona-raton izquierda"></span>
            <span class="zona-raton derecha"></span>
            <span class="rueda-raton"></span>
        </div>
        <div class="acciones-raton">
            <div class="accion-raton"><span class="punto-accion"></span><strong>Clic izquierdo</strong><small>MOVER</small></div>
            <div class="accion-raton"><span class="punto-accion"></span><strong>Clic derecho</strong><small>DISPARAR</small></div>
            <div class="accion-raton"><span class="punto-accion"></span><strong>Rueda arriba</strong><small>HABILIDAD</small></div>
        </div>`;
}

function actualizarVistaMandos() {
    for (let i = 0; i < 3; i++) {
        const numero = i + 1;
        const selector = document.getElementById("mando" + numero);
        const interruptor = document.getElementById("activo" + numero);
        const tarjeta = document.getElementById("tarjetaMando" + numero);
        const ejemplo = document.getElementById("ejemploMando" + numero);
        const textoEstado = tarjeta.querySelector(".switch-texto");
        const esActivo = i === indiceMandoActivo;

        selector.value = mandos[i];
        interruptor.checked = jugadoresActivos[i];
        selector.disabled = !esActivo;
        interruptor.disabled = !esActivo;
        tarjeta.classList.toggle("desactivado", !jugadoresActivos[i]);
        textoEstado.textContent = jugadoresActivos[i] ? "Jugador activo" : "Jugador desactivado";
        document.getElementById("descripcionMando" + numero).textContent =
            jugadoresActivos[i] ? descripcionesMandos[mandos[i]] : "Este jugador no participará en la partida.";
        ejemplo.innerHTML = jugadoresActivos[i]
            ? contenidoVisualMando(mandos[i])
            : '<span class="estado-desactivado">JUGADOR DESACTIVADO</span>';
    }
    aplicarEstadoCarrusel("mandos", indiceMandoActivo);
}

function aplicarEstadoCarrusel(tipo, indiceActivo) {
    const esMandos = tipo === "mandos";
    const contenedor = document.querySelector(esMandos ? "#menuMandos .lista-mandos" : "#lobby .jugadores-config");
    if (!contenedor) return;
    const selectorTarjeta = esMandos ? ".tarjeta-mando" : ".config-jugador";
    const tarjetas = Array.from(contenedor.querySelectorAll(selectorTarjeta));

    tarjetas.forEach((tarjeta, i) => {
        const posicion = (i - indiceActivo + tarjetas.length) % tarjetas.length;
        tarjeta.classList.remove("carrusel-centro", "carrusel-izquierda", "carrusel-derecha", "seleccion-activa");
        if (posicion === 0) {
            tarjeta.classList.add("carrusel-centro", "seleccion-activa");
            tarjeta.setAttribute("aria-current", "true");
        } else if (posicion === 1) {
            tarjeta.classList.add("carrusel-derecha");
            tarjeta.setAttribute("aria-current", "false");
        } else {
            tarjeta.classList.add("carrusel-izquierda");
            tarjeta.setAttribute("aria-current", "false");
        }

        if (!esMandos) {
            tarjeta.querySelectorAll("input, select").forEach(control => {
                control.disabled = i !== indiceActivo;
            });
        }
    });

    const navegacion = document.getElementById(esMandos ? "navegacionMandos" : "navegacionJugadores");
    if (navegacion) {
        navegacion.querySelectorAll("[data-indice]").forEach(boton => {
            const activo = Number(boton.dataset.indice) === indiceActivo;
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-current", activo ? "true" : "false");
        });
    }
}

function seleccionarJugadorMando(indice) {
    indiceMandoActivo = (indice + 3) % 3;
    actualizarVistaMandos();
}

function seleccionarJugadorConfiguracion(indice) {
    indiceConfiguracionActivo = (indice + 3) % 3;
    aplicarEstadoCarrusel("jugadores", indiceConfiguracionActivo);
}

function cambiarEstadoJugador(indice) {
    jugadoresActivos[indice] = document.getElementById("activo" + (indice + 1)).checked;
    actualizarVistaMandos();
}

function indiceActivoConMando(mando) {
    return mandos.findIndex((asignacion, indice) => {
        const activo = jugadores.length > 0
            ? Boolean(jugadores[indice] && jugadores[indice].activo)
            : Boolean(jugadoresActivos[indice]);
        return asignacion === mando && activo;
    });
}

function cambiarMando(indice) {
    const nuevoMando = document.getElementById("mando" + (indice + 1)).value;
    const mandoAnterior = mandos[indice];
    const otroIndice = mandos.findIndex((mando, i) => i !== indice && mando === nuevoMando);

    // Si se elige un mando ocupado, se intercambia con el del otro jugador.
    if (otroIndice !== -1) {
        mandos[otroIndice] = mandoAnterior;
    }

    mandos[indice] = nuevoMando;
    actualizarVistaMandos();
}

/* ============================================================
   5. INICIO, CIERRE Y ESTADO DE LA PARTIDA
   ============================================================ */
function iniciarJuego() {
    const cantidadActivos = jugadoresActivos.filter(Boolean).length;
    if (cantidadActivos < 2) {
        alert("Activa al menos dos jugadores para iniciar la partida.");
        return;
    }

    for (let i = 0; i < 3; i++) {
        configuraciones[i].figura =
            obtenerSelector("figura", i).value;

        configuraciones[i].color =
            obtenerSelector("color", i).value;
    }

    const coloresElegidos = configuraciones.map(jugador => jugador.color);

    if (new Set(coloresElegidos).size !== 3) {
        mensajeLobby.textContent = "Selecciona tres colores diferentes.";
        mensajeLobby.classList.add("visible");
        return;
    }

    mostrarPantalla(partida);
    ajustarCanvas();

    const posiciones = [
        { x: canvas.width * 0.17, y: canvas.height * 0.50, dx: 1, dy: 0 },
        { x: canvas.width * 0.50, y: canvas.height * 0.24, dx: 0, dy: 1 },
        { x: canvas.width * 0.83, y: canvas.height * 0.50, dx: -1, dy: 0 }
    ];

    jugadores = configuraciones.map((configuracion, indice) => ({
        x: posiciones[indice].x,
        y: posiciones[indice].y,
        figura: configuracion.figura,
        color: configuracion.color,
        nombre: (document.getElementById("nombre" + (indice + 1)).value.trim() || "Jugador " + (indice + 1)).slice(0, 18),
        activo: jugadoresActivos[indice],
        vida: 100,
        vivo: jugadoresActivos[indice],
        direccionX: posiciones[indice].dx,
        direccionY: posiciones[indice].dy,
        destinoX: null,
        destinoY: null,
        velocidad: 14.1,
        escudoHasta: 0,
        turboHasta: 0,
        fantasmaHasta: 0,
        potenciaHasta: 0,
        precisionHasta: 0,
        tripleDisparos: 0,
        proximaHabilidad: 0,
        control: indice
    }));

    proyectiles = [];
    teclas = {};
    controlesActivos = true;
    mousePresionado = false;
    juegoTerminado = false;
    mensajeFinal = "";

    for (let i = 0; i < 3; i++) {
        const color = coloresHex[configuraciones[i].color];
        const marca = document.getElementById("marcaDispersion" + (i + 1));
        const tarjeta = document.getElementById("tarjetaDispersion" + (i + 1));
        marca.style.background = color;
        marca.style.color = color;
        tarjeta.style.borderColor = color + "88";
        tarjeta.querySelector("input").style.accentColor = color;
        tarjeta.classList.toggle("oculto", !jugadoresActivos[i]);
    }

    actualizarEstado();
}

function volverLobby() {
    jugadores = [];
    proyectiles = [];
    teclas = {};
    dispersion = [5, 5, 5];

    for (let i = 0; i < 3; i++) {
        const entrada = document.getElementById("precision" + (i + 1));
        entrada.value = "5";
        document.getElementById("valorPrecision" + (i + 1)).textContent = "5°";
    }

    volverInicio();
}

function actualizarEstado() {
    if (jugadores.length === 0) {
        estado.textContent = "Preparando partida...";
        return;
    }

    const resumen = jugadores.map((jugador, indice) => {
        if (!jugador.activo) {
            return "J" + (indice + 1) + ": DESACTIVADO";
        }
        if (!jugador.vivo) {
            return "J" + (indice + 1) + ": ELIMINADO";
        }

        return "J" + (indice + 1) + ": " +
            Math.ceil(jugador.vida) + "/100 de vida";
    }).join(" | ");

    let situacion;

    if (juegoTerminado) {
        situacion = mensajeFinal;
    } else if (controlesActivos) {
        situacion = "CONTROLES ACTIVOS";
    } else {
        situacion = "PAUSA: presiona ESC para continuar";
    }

    estado.textContent = situacion + " | " + resumen;
}

function actualizarResumenHabilidades() {
    habilidadesHabilitadas = Array.from(document.querySelectorAll(".habilidad-opcion input:checked")).map(input => input.value);
    const resumen = document.getElementById("resumenHabilidades");
    resumen.textContent = habilidadesHabilitadas.length
        ? habilidadesHabilitadas.length + " habilidades activadas"
        : "Ninguna habilidad activada";
}

function activarHabilidad(indice) {
    const jugador = jugadores[indice];
    if (!jugador || !jugador.activo || !jugador.vivo || !controlesActivos || juegoTerminado) return;
    if (!habilidadesHabilitadas.length) return;
    const ahora = performance.now();
    if (ahora < jugador.proximaHabilidad) return;
    const habilidad = habilidadesHabilitadas[Math.floor(Math.random() * habilidadesHabilitadas.length)];
    jugador.proximaHabilidad = ahora + 6500;
    switch (habilidad) {
        case "escudo": jugador.escudoHasta = ahora + 4000; break;
        case "turbo": jugador.turboHasta = ahora + 4000; break;
        case "curacion": jugador.vida = Math.min(100, jugador.vida + 30); break;
        case "impulso": {
            const distancia = 115;
            const nx = Math.max(36, Math.min(canvas.width - 36, jugador.x + jugador.direccionX * distancia));
            const ny = Math.max(36, Math.min(canvas.height - 36, jugador.y + jugador.direccionY * distancia));
            if (!rectanguloColisiona(nx, ny, 24)) { jugador.x = nx; jugador.y = ny; }
            break;
        }
        case "triple": jugador.tripleDisparos = 3; break;
        case "potencia": jugador.potenciaHasta = ahora + 5000; break;
        case "invisibilidad": jugador.fantasmaHasta = ahora + 3000; break;
        case "precision": jugador.precisionHasta = ahora + 5000; break;
    }
    mensajeFinal = jugador.nombre + ": " + nombresHabilidades[habilidad];
    estado.textContent = mensajeFinal;
    actualizarEstado();
}

/* ============================================================
   6. MOVIMIENTO, APUNTADO Y DISPAROS
   ============================================================ */
function apuntar(jugador, x, y) {
    const dx = x - jugador.x;
    const dy = y - jugador.y;
    const distancia = Math.hypot(dx, dy);

    if (distancia > 1) {
        jugador.direccionX = dx / distancia;
        jugador.direccionY = dy / distancia;
    }
}

function disparar(indice, objetivoX, objetivoY) {
    if (!controlesActivos || juegoTerminado) return;

    const jugador = jugadores[indice];

    if (!jugador || !jugador.activo || !jugador.vivo) return;

    if (
        Number.isFinite(objetivoX) &&
        Number.isFinite(objetivoY)
    ) {
        apuntar(jugador, objetivoX, objetivoY);
    }

    const angulo = Math.atan2(
        jugador.direccionY,
        jugador.direccionX
    );

    let tipo = jugador.figura;

    if (jugador.figura === "circulo") {
        tipo = Math.random() < 0.5 ? "circulo" : "ovalo";
    } else if (jugador.figura === "cuadrado") {
        tipo = Math.random() < 0.5 ? "cuadrado" : "rombo";
    } else if (jugador.figura === "triangulo") {
        const triangulos = [
            "triangulo", "triangulo-acutangulo", "triangulo-obtusangulo",
            "triangulo-escaleno", "triangulo-isosceles", "triangulo-oblicuo"
        ];
        tipo = triangulos[Math.floor(Math.random() * triangulos.length)];
    }

    const dispersionRad = (performance.now() < jugador.precisionHasta ? 0 : dispersion[indice]) * Math.PI / 180;
    const cantidadDisparos = jugador.tripleDisparos > 0 ? 3 : 2;
    if (jugador.tripleDisparos > 0) jugador.tripleDisparos--;

    for (let i = 0; i < cantidadDisparos; i++) {
        const separacion = cantidadDisparos === 3
            ? (i - 1) * Math.max(dispersionRad / 2, 0.07)
            : (i === 0 ? -dispersionRad / 2 : dispersionRad / 2);

        const anguloDisparo = angulo + separacion;
        const lateral = cantidadDisparos === 3 ? (i - 1) * 5 : (i === 0 ? -6 : 6);

        const x = jugador.x +
            Math.cos(anguloDisparo) * 19 -
            Math.sin(angulo) * lateral;

        const y = jugador.y +
            Math.sin(anguloDisparo) * 19 +
            Math.cos(angulo) * lateral;

        proyectiles.push({
            x: x,
            y: y,
            vx: Math.cos(anguloDisparo) * 10,
            vy: Math.sin(anguloDisparo) * 10,
            color: jugador.color,
            owner: indice,
            dano: performance.now() < jugador.potenciaHasta ? 20 : 10,
            tipo: tipo,
            duracion: 110
        });
    }
}

/* Terrenos: muros en coordenadas proporcionales para adaptarse al tamaño del lienzo. */
function obtenerMuros() {
    const w = canvas.width;
    const h = canvas.height;
    const rect = (x, y, ancho, alto) => ({ x: x * w, y: y * h, w: ancho * w, h: alto * h });
    const mapas = {
        prisma: [
            rect(.39,.24,.22,.025), rect(.39,.725,.22,.025),
            rect(.23,.40,.025,.20), rect(.745,.40,.025,.20),
            rect(.48,.425,.04,.15)
        ],
        hexagono: [
            rect(.18,.24,.26,.022), rect(.56,.24,.26,.022),
            rect(.18,.73,.26,.022), rect(.56,.73,.26,.022),
            rect(.324,.39,.022,.22), rect(.659,.39,.022,.22)
        ],
        fortaleza: [
            rect(.18,.19,.13,.065), rect(.69,.19,.13,.065),
            rect(.18,.745,.13,.065), rect(.69,.745,.13,.065)
        ],
        cruces: [
            rect(.305,.18,.025,.64), rect(.67,.18,.025,.64),
            rect(.40,.32,.20,.025), rect(.40,.655,.20,.025)
        ],
        vacio: []
    };
    return mapas[mapaElegido] || mapas.prisma;
}

function rectanguloColisiona(x, y, radio = 0) {
    return obtenerMuros().some(muro => {
        const px = Math.max(muro.x, Math.min(x, muro.x + muro.w));
        const py = Math.max(muro.y, Math.min(y, muro.y + muro.h));
        return Math.hypot(x - px, y - py) < radio;
    });
}

function dibujarMuros() {
    for (const muro of obtenerMuros()) {
        const gradiente = ctx.createLinearGradient(muro.x, muro.y, muro.x + muro.w, muro.y + muro.h);
        gradiente.addColorStop(0, '#173b61');
        gradiente.addColorStop(.5, '#142541');
        gradiente.addColorStop(1, '#32234f');
        ctx.save();
        ctx.fillStyle = gradiente;
        ctx.strokeStyle = '#63eaff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#37cfff';
        ctx.shadowBlur = 13;
        ctx.fillRect(muro.x, muro.y, muro.w, muro.h);
        ctx.strokeRect(muro.x, muro.y, muro.w, muro.h);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#e0a4ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(muro.x + 4, muro.y + 4, Math.max(0, muro.w - 8), Math.max(0, muro.h - 8));
        ctx.restore();
    }
}

function moverJugadores(deltaFrames = 1) {
    if (!controlesActivos || juegoTerminado) return;

    for (const jugador of jugadores) {
        if (!jugador.activo || !jugador.vivo) continue;

        const pasoMovimiento = jugador.velocidad * (performance.now() < jugador.turboHasta ? 1.7 : 1) * deltaFrames;
        let dx = 0;
        let dy = 0;

        const mandoJugador = mandos[jugador.control];

        if (mandoJugador === "wasd") {
            if (teclas["w"]) dy -= 1;
            if (teclas["s"]) dy += 1;
            if (teclas["a"]) dx -= 1;
            if (teclas["d"]) dx += 1;
        }

        if (mandoJugador === "flechas") {
            if (teclas["arrowup"]) dy -= 1;
            if (teclas["arrowdown"]) dy += 1;
            if (teclas["arrowleft"]) dx -= 1;
            if (teclas["arrowright"]) dx += 1;
        }

        if (mandoJugador === "mouse") {
            if (
                jugador.destinoX !== null &&
                jugador.destinoY !== null
            ) {
                const distanciaX = jugador.destinoX - jugador.x;
                const distanciaY = jugador.destinoY - jugador.y;
                const distancia = Math.hypot(distanciaX, distanciaY);

                if (distancia > pasoMovimiento) {
                    dx = distanciaX / distancia;
                    dy = distanciaY / distancia;
                } else {
                    jugador.x = jugador.destinoX;
                    jugador.y = jugador.destinoY;
                    jugador.destinoX = null;
                    jugador.destinoY = null;
                }
            }

            apuntar(jugador, mouseX, mouseY);
        }

        const longitud = Math.hypot(dx, dy);

        if (longitud > 0) {
            dx /= longitud;
            dy /= longitud;

            jugador.direccionX = dx;
            jugador.direccionY = dy;

            jugador.x += dx * pasoMovimiento;
            jugador.y += dy * pasoMovimiento;
        }

        jugador.x = Math.max(36, Math.min(canvas.width - 36, jugador.x));
        jugador.y = Math.max(36, Math.min(canvas.height - 36, jugador.y));
        if (rectanguloColisiona(jugador.x, jugador.y, 24)) {
            jugador.x -= dx * pasoMovimiento;
            jugador.y -= dy * pasoMovimiento;
            jugador.destinoX = null;
            jugador.destinoY = null;
        }
    }
}

function actualizarProyectiles(deltaFrames = 1) {
    for (let i = proyectiles.length - 1; i >= 0; i--) {
        const proyectil = proyectiles[i];

        proyectil.x += proyectil.vx * deltaFrames;
        proyectil.y += proyectil.vy * deltaFrames;
        proyectil.duracion -= deltaFrames;

        let impacto = false;

        for (let indice = 0; indice < jugadores.length; indice++) {
            const jugador = jugadores[indice];

            if (!jugador.activo || !jugador.vivo) continue;
            if (indice === proyectil.owner) continue;
            const ahoraImpacto = performance.now();
            if (ahoraImpacto < jugador.fantasmaHasta) continue;

            const distancia = Math.hypot(
                jugador.x - proyectil.x,
                jugador.y - proyectil.y
            );

            if (distancia < 36) {
                if (ahoraImpacto >= jugador.escudoHasta) {
                    jugador.vida = Math.max(0, jugador.vida - (proyectil.dano || 10));
                }

                if (jugador.vida === 0) {
                    jugador.vivo = false;
                    jugador.destinoX = null;
                    jugador.destinoY = null;
                }

                impacto = true;
                break;
            }
        }

        const golpeMuro = rectanguloColisiona(proyectil.x, proyectil.y, 3);
        const fuera =
            proyectil.x < -20 ||
            proyectil.x > canvas.width + 20 ||
            proyectil.y < -20 ||
            proyectil.y > canvas.height + 20;

        if (impacto || golpeMuro || proyectil.duracion <= 0 || fuera) {
            proyectiles.splice(i, 1);
        }
    }
}

/* ============================================================
   7. GRAFICOS DE LA ARENA Y DE LOS JUGADORES
   ============================================================ */
function crearFondoArenaCache(ancho, alto) {
    const capa = document.createElement("canvas");
    capa.width = ancho;
    capa.height = alto;
    const fondoCtx = capa.getContext("2d");

    const fondo = fondoCtx.createLinearGradient(0, 0, ancho, alto);
    fondo.addColorStop(0, "#071a35");
    fondo.addColorStop(0.38, "#071127");
    fondo.addColorStop(0.70, "#0b1027");
    fondo.addColorStop(1, "#210d32");
    fondoCtx.fillStyle = fondo;
    fondoCtx.fillRect(0, 0, ancho, alto);

    fondoCtx.save();
    fondoCtx.globalCompositeOperation = "screen";
    const auraIzquierda = fondoCtx.createRadialGradient(0, alto * 0.45, 10, 0, alto * 0.45, ancho * 0.58);
    auraIzquierda.addColorStop(0, "#137cff35");
    auraIzquierda.addColorStop(1, "#137cff00");
    fondoCtx.fillStyle = auraIzquierda;
    fondoCtx.fillRect(0, 0, ancho, alto);

    const auraDerecha = fondoCtx.createRadialGradient(ancho, alto * 0.34, 10, ancho, alto * 0.34, ancho * 0.55);
    auraDerecha.addColorStop(0, "#c12cff2a");
    auraDerecha.addColorStop(1, "#c12cff00");
    fondoCtx.fillStyle = auraDerecha;
    fondoCtx.fillRect(0, 0, ancho, alto);
    fondoCtx.restore();

    for (let x = 0; x <= ancho; x += 40) {
        const mayor = x % 200 === 0;
        fondoCtx.beginPath();
        fondoCtx.moveTo(x, 0);
        fondoCtx.lineTo(x, alto);
        fondoCtx.strokeStyle = mayor ? "#3488c34a" : "#4578aa28";
        fondoCtx.lineWidth = mayor ? 1.5 : 1;
        fondoCtx.stroke();
    }

    for (let y = 0; y <= alto; y += 40) {
        const mayor = y % 200 === 0;
        fondoCtx.beginPath();
        fondoCtx.moveTo(0, y);
        fondoCtx.lineTo(ancho, y);
        fondoCtx.strokeStyle = mayor ? "#3488c34a" : "#4578aa28";
        fondoCtx.lineWidth = mayor ? 1.5 : 1;
        fondoCtx.stroke();
    }

    return capa;
}

function dibujarFondo() {
    const ancho = canvas.width;
    const alto = canvas.height;
    const tiempo = contadorCuadro;

    if (!fondoArenaCache || anchoFondoCache !== ancho || altoFondoCache !== alto) {
        fondoArenaCache = crearFondoArenaCache(ancho, alto);
        anchoFondoCache = ancho;
        altoFondoCache = alto;
    }
    ctx.drawImage(fondoArenaCache, 0, 0);

    // Destellos animados: se reducen un poco y solo una parte usa blur, para aligerar el render.
    for (let i = 0; i < 60; i++) {
        const x = (i * 197.3 + tiempo * (0.10 + (i % 3) * 0.035)) % ancho;
        const yBase = (i * 113.7) % alto;
        const y = (yBase + Math.sin(tiempo * 0.018 + i) * 8 + alto) % alto;
        const destacado = i % 8 === 0;
        const radio = destacado ? 2.1 : 1.05;
        ctx.beginPath();
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? "#9eeaff" : "#6bafff";
        ctx.globalAlpha = 0.45 + (Math.sin(tiempo * 0.045 + i) + 1) * 0.25;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = destacado ? 8 : 0;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Borde luminoso pulsante.
    const pulso = 9 + (Math.sin(tiempo * 0.035) + 1) * 5;
    ctx.strokeStyle = "#42caff";
    ctx.shadowColor = "#388aff";
    ctx.shadowBlur = pulso;
    ctx.lineWidth = 3;
    ctx.strokeRect(11, 11, ancho - 22, alto - 22);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#c16cff78";
    ctx.lineWidth = 1;
    ctx.strokeRect(17, 17, ancho - 34, alto - 34);
}
function dibujarDispersion(jugador) {
    if (!jugador.activo || !jugador.vivo) return;

    const angulo = Math.atan2(jugador.direccionY, jugador.direccionX);
    const mitad = dispersion[jugador.control] * Math.PI / 360;
    const radio = Math.min(265, canvas.width * 0.19);
    const inicio = angulo - mitad;
    const fin = angulo + mitad;
    const color = coloresHex[jugador.color];

    ctx.save();
    ctx.translate(jugador.x, jugador.y);

    // Cono de dispersion con degradado y brillo.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radio, inicio, fin);
    ctx.closePath();
    const cono = ctx.createRadialGradient(0, 0, 10, 0, 0, radio);
    cono.addColorStop(0, color + "35");
    cono.addColorStop(1, color + "00");
    ctx.fillStyle = cono;
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fill();

    // Dos rayos exteriores animados.
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 13;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -contadorCuadro * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(inicio) * radio, Math.sin(inicio) * radio);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(fin) * radio, Math.sin(fin) * radio);
    ctx.stroke();

    // Linea central de mira y extremos brillantes.
    ctx.setLineDash([5, 11]);
    ctx.lineDashOffset = contadorCuadro * 0.28;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angulo) * radio, Math.sin(angulo) * radio);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const extremo of [inicio, fin]) {
        const ex = Math.cos(extremo) * radio;
        const ey = Math.sin(extremo) * radio;
        ctx.beginPath();
        ctx.arc(ex, ey, 5 + (Math.sin(contadorCuadro * 0.09) + 1), 0, Math.PI * 2);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
}

function dibujarJugador(jugador) {
    if (!jugador.activo || !jugador.vivo) return;

    const color = coloresHex[jugador.color];
    const pulso = 1 + Math.sin(contadorCuadro * 0.075 + jugador.control) * 0.055;

    ctx.save();
    if (performance.now() < jugador.fantasmaHasta) ctx.globalAlpha = 0.28;
    ctx.translate(jugador.x, jugador.y);
    ctx.rotate(Math.atan2(jugador.direccionY, jugador.direccionX));
    if (performance.now() < jugador.escudoHasta) {
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "#79f7ff"; ctx.lineWidth = 4; ctx.shadowColor = "#79f7ff"; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0;
    }

    // Anillos exteriores tipo energia.
    ctx.beginPath();
    ctx.arc(0, 0, 43 * pulso, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.25;
    ctx.shadowBlur = 16;
    ctx.stroke();

    // Indicador luminoso de la direccion del disparo.
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(43, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.shadowBlur = 23;
    ctx.stroke();

    const relleno = ctx.createLinearGradient(-30, -30, 30, 30);
    relleno.addColorStop(0, "#ffffff");
    relleno.addColorStop(0.17, color);
    relleno.addColorStop(1, color);
    ctx.globalAlpha = 1;
    ctx.fillStyle = relleno;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    trazarFigura(ctx, jugador.figura, 29);
    ctx.fill();
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Reflejo interior para dar aspecto de pieza energetica.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 0;
    trazarFigura(ctx, jugador.figura, 21);
    ctx.stroke();
    ctx.restore();

    // Barra de vida luminosa.
    const barraAncho = 82;
    const barraAlto = 8;
    const barraX = jugador.x - barraAncho / 2;
    const barraY = jugador.y - 63;
    ctx.fillStyle = "#050916d9";
    ctx.fillRect(barraX - 3, barraY - 3, barraAncho + 6, barraAlto + 6);
    ctx.strokeStyle = color + "b8";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 11;
    ctx.strokeRect(barraX - 3, barraY - 3, barraAncho + 6, barraAlto + 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#25334a";
    ctx.fillRect(barraX, barraY, barraAncho, barraAlto);

    const colorVida = jugador.vida > 60 ? "#44ffc1" : jugador.vida > 30 ? "#ffe66b" : "#ff477e";
    const vidaGradiente = ctx.createLinearGradient(barraX, 0, barraX + barraAncho, 0);
    vidaGradiente.addColorStop(0, colorVida);
    vidaGradiente.addColorStop(1, color);
    ctx.fillStyle = vidaGradiente;
    ctx.shadowColor = colorVida;
    ctx.shadowBlur = 12;
    ctx.fillRect(barraX, barraY, barraAncho * jugador.vida / 100, barraAlto);
    ctx.shadowBlur = 0;

    // Nombre sobre una pequena placa oscura para mejorar la lectura.
    ctx.font = "bold 25px Segoe UI, Arial";
    const nombreAncho = Math.min(250, ctx.measureText(jugador.nombre).width + 22);
    const nombreX = jugador.x - nombreAncho / 2;
    const nombreY = jugador.y + 45;
    ctx.fillStyle = "#071124d9";
    ctx.fillRect(nombreX, nombreY, nombreAncho, 31);
    ctx.strokeStyle = color + "99";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeRect(nombreX, nombreY, nombreAncho, 31);
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#050817";
    ctx.strokeText(jugador.nombre, jugador.x, nombreY + 16, nombreAncho - 10);
    ctx.fillStyle = "#f7fcff";
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    ctx.fillText(jugador.nombre, jugador.x, nombreY + 16, nombreAncho - 10);
    ctx.shadowBlur = 0;

    if (mandos[jugador.control] === "mouse" && jugador.destinoX !== null && controlesActivos) {
        ctx.beginPath();
        ctx.arc(jugador.destinoX, jugador.destinoY, 13, 0, Math.PI * 2);
        ctx.strokeStyle = "#b6f7ff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#52eaff";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function dibujarProyectil(proyectil) {
    const color = coloresHex[proyectil.color];
    ctx.save();
    ctx.translate(proyectil.x, proyectil.y);
    ctx.rotate(Math.atan2(proyectil.vy, proyectil.vx));

    // Cola de luz que hace mas visible el desplazamiento del proyectil.
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(3, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;

    if (proyectil.tipo === "ovalo") {
        ctx.beginPath();
        ctx.ellipse(0, 0, 17, 10, 0, 0, Math.PI * 2);
    } else {
        trazarFigura(ctx, proyectil.tipo, 14);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Nucleo blanco brillante.
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
}

function dibujarJuego() {
    dibujarFondo();
    dibujarMuros();

    for (const jugador of jugadores) {
        dibujarDispersion(jugador);
    }

    for (const proyectil of proyectiles) {
        dibujarProyectil(proyectil);
    }

    for (const jugador of jugadores) {
        dibujarJugador(jugador);
    }

    if (!controlesActivos && !juegoTerminado) {
        ctx.fillStyle = "#00000099";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "PAUSA",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.font = "17px Arial";
        ctx.fillText(
            "Presiona ESC para continuar",
            canvas.width / 2,
            canvas.height / 2 + 35
        );
    }

    if (juegoTerminado) {
        ctx.fillStyle = "#000000aa";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            mensajeFinal,
            canvas.width / 2,
            canvas.height / 2
        );

    }
}

/* ============================================================
   8. COLISIONES, VICTORIA Y POSICION DEL MOUSE
   ============================================================ */
function comprobarFin() {
    if (juegoTerminado || jugadores.length === 0) return;

    const vivos = jugadores.filter(jugador => jugador.activo && jugador.vivo);

    if (vivos.length <= 1) {
        juegoTerminado = true;
        controlesActivos = false;
        teclas = {};

        if (vivos.length === 1) {
            mensajeFinal = "¡" + vivos[0].nombre + " gana!";
        } else {
            mensajeFinal = "EMPATE";
        }

        actualizarEstado();
    }
}

function obtenerPosicionMouse(evento) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (evento.clientX - rect.left) * canvas.width / rect.width,
        y: (evento.clientY - rect.top) * canvas.height / rect.height
    };
}

function asignarDestino(x, y) {
    if (!controlesActivos || juegoTerminado) return;

    const indiceMouse = indiceActivoConMando("mouse");
    const jugador = jugadores[indiceMouse];

    if (indiceMouse === -1 || !jugador || !jugador.activo || !jugador.vivo) return;

    jugador.destinoX = Math.max(36, Math.min(canvas.width - 36, x));
    jugador.destinoY = Math.max(36, Math.min(canvas.height - 36, y));
}

/* ============================================================
   9. EVENTOS DE TECLADO, MOUSE Y CONTROLES
   ============================================================ */
document.addEventListener("keydown", evento => {
    if (partida.classList.contains("oculto")) return;

    const tecla = evento.key.toLowerCase();

    if (
        [
            "w", "a", "s", "d",
            "arrowup", "arrowdown",
            "arrowleft", "arrowright",
            "shift", "enter", "e"
        ].includes(tecla)
    ) {
        evento.preventDefault();
    }

    if (tecla === "escape") {
        if (juegoTerminado) return;

        controlesActivos = !controlesActivos;
        teclas = {};
        mousePresionado = false;

        actualizarEstado();
        return;
    }

    teclas[tecla] = true;

    if (evento.repeat) return;
    if (!controlesActivos || juegoTerminado) return;

    if (tecla === "q") {
        const indiceWASD = indiceActivoConMando("wasd");
        if (indiceWASD !== -1) disparar(indiceWASD);
    }
    if (tecla === "e") {
        const indiceWASD = indiceActivoConMando("wasd");
        if (indiceWASD !== -1) activarHabilidad(indiceWASD);
    }
    if (tecla === "enter") {
        const indiceFlechas = indiceActivoConMando("flechas");
        if (indiceFlechas !== -1) activarHabilidad(indiceFlechas);
    }

    if (
        tecla === "shift" &&
        (evento.code === "ShiftRight" || evento.location === 2)
    ) {
        const indiceFlechas = indiceActivoConMando("flechas");
        if (indiceFlechas !== -1) disparar(indiceFlechas);
    }
});

document.addEventListener("keyup", evento => {
    teclas[evento.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", evento => {
    const posicion = obtenerPosicionMouse(evento);

    mouseX = posicion.x;
    mouseY = posicion.y;

    if (mousePresionado && controlesActivos) {
        asignarDestino(posicion.x, posicion.y);
    }
});

canvas.addEventListener("mousedown", evento => {
    const posicion = obtenerPosicionMouse(evento);

    if (evento.button === 0) {
        mousePresionado = true;
        asignarDestino(posicion.x, posicion.y);
    }

    if (evento.button === 2) {
        evento.preventDefault();
        const indiceMouse = indiceActivoConMando("mouse");
        if (indiceMouse !== -1) {
            disparar(indiceMouse, posicion.x, posicion.y);
        }
    }
});

document.addEventListener("mouseup", () => {
    mousePresionado = false;
});

canvas.addEventListener("contextmenu", evento => {
    evento.preventDefault();
});

canvas.addEventListener("wheel", evento => {
    if (evento.deltaY < 0) {
        evento.preventDefault();
        const indiceMouse = indiceActivoConMando("mouse");
        if (indiceMouse !== -1) activarHabilidad(indiceMouse);
    }
}, { passive: false });


window.addEventListener("blur", () => {
    teclas = {};
    mousePresionado = false;
});

for (let i = 0; i < 3; i++) {
    document.getElementById("precision" + (i + 1)).addEventListener("input", evento => {
        dispersion[i] = Number(evento.target.value);
        document.getElementById("valorPrecision" + (i + 1)).textContent =
            dispersion[i] + "°";
    });
}

const observadorArena = new ResizeObserver(() => ajustarCanvas());
observadorArena.observe(arena);
window.addEventListener("resize", ajustarCanvas);

let mapaElegido = "prisma";
function actualizarSelectorMapas() {
    const tarjetas = Array.from(document.querySelectorAll("[data-mapa]"));
    const indice = Math.max(0, tarjetas.findIndex(t => t.dataset.mapa === mapaElegido));
    tarjetas.forEach((tarjeta, i) => {
        tarjeta.classList.remove("mapa-activo", "mapa-anterior", "mapa-siguiente");
        if (i === indice) tarjeta.classList.add("mapa-activo");
        else if (i === (indice - 1 + tarjetas.length) % tarjetas.length) tarjeta.classList.add("mapa-anterior");
        else if (i === (indice + 1) % tarjetas.length) tarjeta.classList.add("mapa-siguiente");
    });
    const nombre = tarjetas[indice]?.querySelector("h3")?.textContent || "PRISMA CENTRAL";
    document.getElementById("nombreMapaSeleccionado").textContent = nombre;
}
function cambiarMapa(paso) {
    const tarjetas = Array.from(document.querySelectorAll("[data-mapa]"));
    let indice = tarjetas.findIndex(t => t.dataset.mapa === mapaElegido);
    indice = (indice + paso + tarjetas.length) % tarjetas.length;
    mapaElegido = tarjetas[indice].dataset.mapa;
    actualizarSelectorMapas();
}

document.getElementById("botonConfigurar").addEventListener("click", abrirConfiguracion);
document.getElementById("botonAbrirMandos").addEventListener("click", abrirMenuMandos);
document.getElementById("botonInicioHabilidades").addEventListener("click", () => { actualizarResumenHabilidades(); mostrarPantalla(pantallaHabilidades); });
document.getElementById("botonAbrirTerrenos").addEventListener("click", () => { actualizarSelectorMapas(); mostrarPantalla(seleccionMapa); });
document.getElementById("botonMandosGuardar").addEventListener("click", volverInicio);
document.getElementById("botonMandosVolverArriba").addEventListener("click", volverInicio);
document.getElementById("botonLobbyVolver").addEventListener("click", volverInicio);
document.getElementById("botonAbrirHabilidadesLobby").addEventListener("click", () => { actualizarResumenHabilidades(); mostrarPantalla(pantallaHabilidades); });
document.getElementById("botonVolver").addEventListener("click", volverLobby);
document.getElementById("botonMapasVolver").addEventListener("click", () => {
    if (jugadoresActivos.some(Boolean)) mostrarPantalla(lobby);
    else mostrarPantalla(inicio);
});
document.getElementById("botonElegirMapa").addEventListener("click", () => {
    actualizarSelectorMapas();
    mostrarPantalla(inicio);
});
// ÚNICO botón autorizado para comenzar una partida.
document.getElementById("botonPlay").addEventListener("click", () => iniciarJuego());
document.getElementById("botonHabilidadesVolver").addEventListener("click", () => {
    if (jugadoresActivos.some(Boolean)) mostrarPantalla(lobby); else mostrarPantalla(inicio);
});
document.getElementById("botonHabilidadesTerreno").addEventListener("click", () => {
    actualizarResumenHabilidades(); actualizarSelectorMapas(); mostrarPantalla(seleccionMapa);
});
document.querySelectorAll(".habilidad-opcion input").forEach(input => input.addEventListener("change", actualizarResumenHabilidades));
document.querySelectorAll("[data-mapa]").forEach(tarjeta => tarjeta.addEventListener("click", () => {
    mapaElegido = tarjeta.dataset.mapa;
    actualizarSelectorMapas();
}));
document.querySelectorAll("[data-mover-mapa]").forEach(boton => boton.addEventListener("click", () => cambiarMapa(Number(boton.dataset.moverMapa))));


for (let i = 0; i < 3; i++) {
    document.getElementById("mando" + (i + 1)).addEventListener("change", () => {
        cambiarMando(i);
    });

    document.getElementById("activo" + (i + 1)).addEventListener("change", () => {
        cambiarEstadoJugador(i);
    });
}
actualizarVistaMandos();

for (let i = 0; i < 3; i++) {
    obtenerSelector("figura", i).addEventListener("change", () => {
        actualizarFigura(i);
    });

    obtenerSelector("color", i).addEventListener("change", () => {
        actualizarColor(i);
    });

    document.getElementById("nombre" + (i + 1)).addEventListener("input", () => {
        dibujarVista(i);
    });
}

/* ============================================================
   10. BUCLE PRINCIPAL E INICIALIZACION
   ============================================================ */
function ciclo(tiempoActual = 0) {
    const deltaMs = ultimoTiempoFrame ? tiempoActual - ultimoTiempoFrame : 1000 / 60;
    ultimoTiempoFrame = tiempoActual || performance.now();
    // Normaliza la simulacion a 60 FPS; el limite evita saltos grandes al volver de una pestaña inactiva.
    const deltaFrames = Math.min(Math.max(deltaMs / (1000 / 60), 0.5), 4);

    if (!partida.classList.contains("oculto")) {
        const cuadroAnterior = contadorCuadro;
        if (controlesActivos && !juegoTerminado) {
            moverJugadores(deltaFrames);
            actualizarProyectiles(deltaFrames);
            comprobarFin();
        }

        dibujarJuego();
        contadorCuadro += deltaFrames;

        if (Math.floor(cuadroAnterior / 6) !== Math.floor(contadorCuadro / 6)) {
            actualizarEstado();
        }
    }

    requestAnimationFrame(ciclo);
}

/* Navegacion tipo carrusel: la tarjeta elegida queda centrada, nítida y editable. */
const contenedorConfiguracion = document.querySelector("#lobby .jugadores-config");
const contenedorMandos = document.querySelector("#menuMandos .lista-mandos");

contenedorConfiguracion.addEventListener("click", evento => {
    const tarjeta = evento.target.closest(".config-jugador");
    if (!tarjeta) return;
    const indice = Number(tarjeta.querySelector("h3").textContent.match(/\d+/)?.[0] || 1) - 1;
    if (indice !== indiceConfiguracionActivo) seleccionarJugadorConfiguracion(indice);
});

contenedorMandos.addEventListener("click", evento => {
    const tarjeta = evento.target.closest(".tarjeta-mando");
    if (!tarjeta) return;
    const indice = Number(tarjeta.id.replace("tarjetaMando", "")) - 1;
    if (indice !== indiceMandoActivo) seleccionarJugadorMando(indice);
});

document.querySelectorAll("[data-mover-carrusel]").forEach(boton => {
    boton.addEventListener("click", () => {
        const tipo = boton.dataset.moverCarrusel;
        const paso = Number(boton.dataset.paso);
        if (tipo === "mandos") seleccionarJugadorMando(indiceMandoActivo + paso);
        else seleccionarJugadorConfiguracion(indiceConfiguracionActivo + paso);
    });
});

document.querySelectorAll("[data-seleccionar-carrusel]").forEach(boton => {
    boton.addEventListener("click", () => {
        const tipo = boton.dataset.seleccionarCarrusel;
        const indice = Number(boton.dataset.indice);
        if (tipo === "mandos") seleccionarJugadorMando(indice);
        else seleccionarJugadorConfiguracion(indice);
    });
});

actualizarColores();
actualizarMensajeLobby();
seleccionarJugadorMando(0);
seleccionarJugadorConfiguracion(0);
mostrarPantalla(inicio);

for (let i = 0; i < 3; i++) {
    dibujarVista(i);
}

requestAnimationFrame(ciclo);