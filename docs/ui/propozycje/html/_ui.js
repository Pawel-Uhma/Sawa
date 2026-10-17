// Pasek statusu iOS (makieta)
document.querySelectorAll('.status').forEach(el => {
  el.innerHTML = `<span>11:45</span><span class="ikony">
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.6c2.2 0 4.2.8 5.7 2.2l1.1-1.2A10 10 0 0 0 8 1 10 10 0 0 0 1.2 3.6l1.1 1.2A8.3 8.3 0 0 1 8 2.6Zm0 3.3c1.3 0 2.5.5 3.4 1.3l1.1-1.2a6.6 6.6 0 0 0-9 0l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3Zm0 3.3c.5 0 .9.2 1.2.5L8 11 6.8 9.7c.3-.3.7-.5 1.2-.5Z"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45"/></svg></span>`;
});
