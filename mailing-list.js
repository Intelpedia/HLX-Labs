(() => {
  const message = document.querySelector('#contactStatus');
  const list = document.querySelector('#contacts');
  const load = document.querySelector('#loadContacts');
  const download = document.querySelector('#downloadContacts');
  const previous = document.querySelector('#contactsPrevious');
  const next = document.querySelector('#contactsNext');
  let offset = 0, busy = false, version = 0, canPrevious = false, canNext = false;
  const endpoint = 'https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/discount-report';
  function clear() { version++; canPrevious=false; canNext=false; list.replaceChildren(); message.textContent = ''; previous.disabled = true; next.disabled = true; }
  async function request(exportCsv) {
    if (busy) return;
    busy = true;
    const currentVersion = version;
    for (const button of [load,download,previous,next]) button.disabled = true;
    message.textContent = exportCsv ? 'Preparing deduplicated CSV…' : 'Loading contacts…';
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) throw new Error('Sign in with your administrator account.');
      const params = new URLSearchParams({view:'contacts',offset:String(offset)});
      if (exportCsv) params.set('download','csv');
      const response = await fetch(endpoint + '?' + params, {headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Unable to load contacts.'); }
      if (currentVersion !== version) return;
      if (exportCsv) {
        const blob = await response.blob();
        if (currentVersion !== version) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'hlx-mailing-list.csv';
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url),1000);
        message.textContent = 'Downloaded all unique account and purchase emails.';
        return;
      }
      const result = await response.json();
      if (currentVersion !== version) return;
      const rows = result.contacts.map(contact => {
        const row = document.createElement('tr');
        for (const value of [contact.email,[contact.has_account?'Account':'',contact.has_purchase?'Purchase':''].filter(Boolean).join(' + '),contact.has_account?(contact.account_confirmed?'Yes':'No'):'—',contact.paid_orders,new Date(contact.first_seen).toLocaleDateString(),new Date(contact.last_seen).toLocaleDateString()]) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        return row;
      });
      list.replaceChildren(...rows);
      message.textContent = `${result.total_contacts} unique emails · ${result.account_contacts} with accounts · ${result.purchase_contacts} with purchases. Showing ${result.total_contacts?offset+1:0}–${Math.min(offset+result.page_size,result.total_contacts)}.`;
      canPrevious = offset > 0;
      canNext = offset + result.page_size < result.total_contacts;
    } catch (error) {
      if (currentVersion === version) { canPrevious=false; canNext=false; list.replaceChildren(); message.textContent = error.message || 'Unable to load contacts.'; }
    } finally { busy=false; load.disabled=false; download.disabled=false; previous.disabled=!canPrevious; next.disabled=!canNext; }
  }
  load.addEventListener('click',()=>{offset=0;request(false);});
  download.addEventListener('click',()=>request(true));
  previous.addEventListener('click',()=>{offset=Math.max(0,offset-100);request(false);});
  next.addEventListener('click',()=>{offset+=100;request(false);});
  window.HLXMailingList = { clear };
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
})();
