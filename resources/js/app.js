import '../css/app.css'

window.onload = () => {
  if (document.getElementById('topic').value && document.getElementById('content').value)
    document.getElementById('sendButton').disabled = false
}
