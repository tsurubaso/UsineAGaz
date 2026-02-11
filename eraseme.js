function copyToClipboard(id, text) {
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById("msg-" + id);
    el.innerText = "✅ Copié";

    setTimeout(() => {
      el.innerText = "";
    }, 2000);
  });
}
