import '../css/app.css'

window.onload = () => {
  if (
    document.getElementById('topic') &&
    document.getElementById('topic')?.value &&
    document.getElementById('content').value &&
    document.getElementById('content')
  )
    document.getElementById('sendButton').disabled = false
}
