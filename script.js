// ===============================
// FECHA AUTOMÁTICA (corrige zona horaria)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const inputFecha = document.getElementById("fecha");

  if (inputFecha) {
    const hoy = new Date();
    const fechaLocal = new Date(
      hoy.getTime() - hoy.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    inputFecha.value = fechaLocal;
  }
});

const membersContainer = document.getElementById("membersContainer");
const visitorsContainer = document.getElementById("visitorsContainer");

let visitorIndex = 0;

// ===============================
// MIEMBROS
// ===============================
function addMember() {
  const select = document.getElementById("childSelect");
  const name = select.value;

  if (!name) return alert("Seleccione un ciudadano");
  if (document.getElementById("member-" + name)) return;

  const div = document.createElement("div");
  div.className = "card";
  div.id = "member-" + name;

  div.innerHTML = `
    <h3>${name}</h3>
    ${meritsTable(`member_${name}`)}
  `;

  membersContainer.appendChild(div);
  select.value = "";
}

// ===============================
// VISITANTES
// ===============================
function addVisitor() {
  const hoy = new Date();
  const fechaLocal = new Date(
    hoy.getTime() - hoy.getTimezoneOffset() * 60000
  ).toISOString().split("T")[0];

  const id = "visitor-" + visitorIndex++;

  const div = document.createElement("div");
  div.className = "card";
  div.id = id;

  div.innerHTML = `
    <h3>Visitante</h3>

    <input type="text" placeholder="Nombres y Apellidos" required
      oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '')">

    <label>Fecha de Nacimiento</label>
    <input type="date" required>

    <label>Fecha de Registro</label>
    <input type="date" value="${fechaLocal}" readonly>

    <input type="tel" placeholder="Teléfono del contacto" required
      oninput="this.value = this.value.replace(/[^0-9]/g, '')">

    <input type="text" placeholder="Nombre del contacto" required
      oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '')">

    ${meritsTable(id)}
  `;

  visitorsContainer.appendChild(div);
}

// ===============================
// TABLA MÉRITOS
// ===============================
function meritsTable(prefix) {
  return `
    <table class="table">
      <tr>
        <th>Cumplimiento Méritos</th>
        <th>SI</th>
        <th>NO</th>
      </tr>
      ${row("ASISTENCIA", prefix)}
      ${row("BIBLIA", prefix)}
      ${row("VERSICULO SEMANAL", prefix)}
      ${row("AMIGO INVITADO", prefix)}
    </table>
  `;
}

function row(label, prefix) {
  const key = label.replace(/\s/g, "_").toLowerCase();
  return `
    <tr>
      <td>${label}</td>
      <td><input type="radio" name="${prefix}_${key}" value="SI" required></td>
      <td><input type="radio" name="${prefix}_${key}" value="NO"></td>
    </tr>
  `;
}

// ===============================
// OBTENER MÉRITOS
// ===============================
function getMerits(card) {
  const labels = ["asistencia", "biblia", "versiculo_semanal", "amigo_invitado"];

  return labels.map(key => {
    const checked = card.querySelector(`input[name*="${key}"]:checked`);
    return checked ? checked.value : "";
  });
}

// ===============================
// ENVÍO A GOOGLE SHEETS
// ===============================
document.getElementById("registroForm").addEventListener("submit", e => {
  e.preventDefault();

  const hoy = new Date();
  const fecha = new Date(
    hoy.getTime() - hoy.getTimezoneOffset() * 60000
  ).toISOString().split("T")[0];

  const selects = document.querySelectorAll("select");
  const hora = selects[0]?.value || "";
  const maestro = selects[1]?.value || "";

  const members = document.querySelectorAll("#membersContainer .card");
  const visitors = document.querySelectorAll("#visitorsContainer .card");

  // ❌ No permitir enviar vacío
  if (members.length === 0 && visitors.length === 0) {
    alert("Debes agregar al menos un miembro o un visitante.");
    return;
  }

  let valid = true;

  // ===============================
  // VALIDAR MIEMBROS
  // ===============================
  members.forEach(card => {
    const radios = card.querySelectorAll("input[type='radio']");
    const names = [...new Set([...radios].map(r => r.name))];

    names.forEach(name => {
      if (!card.querySelector(`input[name="${name}"]:checked`)) {
        valid = false;
      }
    });
  });

  // ===============================
  // VALIDAR VISITANTES
  // ===============================
  visitors.forEach(card => {
    const requiredInputs = card.querySelectorAll("input[required]");

    requiredInputs.forEach(input => {
      if (!input.value) valid = false;
    });

    const radios = card.querySelectorAll("input[type='radio']");
    const names = [...new Set([...radios].map(r => r.name))];

    names.forEach(name => {
      if (!card.querySelector(`input[name="${name}"]:checked`)) {
        valid = false;
      }
    });
  });

  if (!valid) {
    alert("Completa todos los campos y méritos antes de enviar.");
    return;
  }

  let rows = [];

  // ===============================
  // MIEMBROS
  // ===============================
  members.forEach(card => {
    const nombre = card.querySelector("h3").innerText;
    const datos = getMerits(card);

    rows.push([
      "Miembro",
      nombre,
      "",
      "",
      "",
      ...datos,
      fecha,
      hora,
      maestro
    ]);
  });

  // ===============================
  // VISITANTES
  // ===============================
  visitors.forEach(card => {
    const inputs = card.querySelectorAll("input");

    const nombreVisitante   = inputs[0].value;
    const fechaNacimiento   = inputs[1].value;
    const telefonoContacto  = inputs[3].value;
    const nombreContacto    = inputs[4].value;

    const datos = getMerits(card);

    rows.push([
      "Visitante",
      nombreVisitante,
      fechaNacimiento,
      telefonoContacto,
      nombreContacto,
      ...datos,
      fecha,
      hora,
      maestro
    ]);
  });

  // ===============================
  // ENVIAR A GOOGLE SHEETS
  // ===============================
  fetch("https://script.google.com/macros/s/AKfycbxCRfO88yZX_PezhffwqgCc3J8Vlt1tOMEzq-x6j4cLVihbQSMsBUoxWXzyBboNAe1ZmA/exec", {
    method: "POST",
    body: JSON.stringify(rows),
    mode: "no-cors"
  });

  alert("Registro guardado correctamente en Google Sheets ✅");

  document.getElementById("registroForm").reset();
  membersContainer.innerHTML = "";
  visitorsContainer.innerHTML = "";
});
