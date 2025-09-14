// Global Balance Manager (integer display)
// Keeps a per-user balance in localStorage and syncs common UI spots across pages.
(function(){
  const KEY = 'app_balance_v1';
  const guard = { rendering: false };

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100; // store with cents for math safety
  const asIntString = (n) => String(Math.round(Number(n) || 0)); // display as integer only
  const parseNumLike = (str) => {
    if (str == null) return 0;
    const n = parseFloat(String(str).replace(/[^0-9.,-]/g,'').replace(',','.'));
    return isFinite(n) ? n : 0;
  };

  function read(){
    const raw = localStorage.getItem(KEY);
    const val = raw == null ? 0 : Number(raw);
    return isFinite(val) ? round2(val) : 0;
  }
  function write(v){
    const val = round2(v);
    localStorage.setItem(KEY, String(val.toFixed(2)));
    render();
    return val;
  }
  function add(delta){ return write(read() + Number(delta || 0)); }
  function spend(delta){ return write(read() - Math.abs(Number(delta || 0))); }

  function targets(){
    return [
      ...document.querySelectorAll('.balance .element .text-wrapper-2'),
      ...document.querySelectorAll('.balance .div-wrapper .text-wrapper-4'),
      ...document.querySelectorAll('.amount-balance .div-wrapper .text-wrapper-4'),
    ];
  }

  function render(){
    if (guard.rendering) return; guard.rendering = true;
    const bal = read();
    const formatted = asIntString(bal);
    targets().forEach(el => { el.textContent = formatted; });
    guard.rendering = false;
  }

  // Observe manual DOM edits (e.g., page logic updates header), and propagate to storage + other pages
  function attachObservers(){
    let writeTimer = null;
    const obs = new MutationObserver(() => {
      if (guard.rendering) return; // ignore our own updates
      const head = document.querySelector('.balance .element .text-wrapper-2');
      if (!head) return;
      const n = parseNumLike(head.textContent);
      // Если значение не изменилось по сути — ничего не делаем
      if (round2(n) === read()) return;
      // Дебаунс, чтобы не писать слишком часто
      clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        write(n);
      }, 50);
    });
    const head = document.querySelector('.balance .element .text-wrapper-2');
    if (head) obs.observe(head, { characterData: true, childList: true, subtree: true });
  }

  // React to changes from other tabs/windows
  window.addEventListener('storage', (e) => { if (e.key === KEY) render(); });

  // Expose simple API
  window.Balance = {
    read, write, add, spend, render,
    get value(){ return read(); },
    set value(v){ write(v); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize: if no stored value, try to parse existing UI once
    if (localStorage.getItem(KEY) == null) {
      const probe = document.querySelector('.balance .element .text-wrapper-2')
                 || document.querySelector('.amount-balance .div-wrapper .text-wrapper-4');
      if (probe) write(parseNumLike(probe.textContent));
    }

    render();
    attachObservers();
  });
})();
