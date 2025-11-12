function salvarGratidao() {
  const texto = document.getElementById("gratidaoTexto").value.trim();
  if (!texto) return alert("Por favor, escreva algo antes de salvar!");

  const lista = JSON.parse(localStorage.getItem("gratidoes") || "[]");
  lista.push({ texto, data: new Date().toLocaleDateString() });
  localStorage.setItem("gratidoes", JSON.stringify(lista));
  document.getElementById("gratidaoTexto").value = "";
  mostrarGratidao();
}

function mostrarGratidao() {
  const lista = JSON.parse(localStorage.getItem("gratidoes") || "[]");
  const container = document.getElementById("listaGratidao");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum registro ainda. Comece escrevendo algo!</p>";
    return;
  }

  lista.slice(-5).reverse().forEach((item) => {
    const div = document.createElement("div");
    div.className = "item-gratidao";
    div.innerHTML = `<strong>${item.data}</strong>: ${item.texto}`;
    container.appendChild(div);
  });
}

const dicas = [
  "Faça uma caminhada ao ar livre.",
  "Respire fundo e se alongue por 5 minutos.",
  "Evite redes sociais por uma hora.",
  "Beba água e alimente-se bem.",
  "Agradeça por pequenas conquistas.",
  "Tire um tempo para cuidar de você.",
];

function carregarDicas() {
  const ul = document.getElementById("listaDicas");
  dicas.forEach((dica) => {
    const li = document.createElement("li");
    li.textContent = dica;
    ul.appendChild(li);
  });
}

document.getElementById("formHumor").addEventListener("submit", function (e) {
  e.preventDefault();
  const selecionado = document.querySelector('input[name="humor"]:checked');
  const resposta = document.getElementById("respostaHumor");

  if (selecionado) {
    resposta.textContent = `Você está se sentindo "${selecionado.value}". 💚 Continue se cuidando!`;
  } else {
    resposta.textContent = "Por favor, selecione uma opção.";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  mostrarGratidao();
  carregarDicas();
});
