chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoBumpAlarm') {
    chrome.storage.local.get(['autoBumpEnabled'], (res) => {
      if (res.autoBumpEnabled) {
        performBump();
      }
    });
  }
});

async function performBump() {
  try {
    let homeRes = await fetch('https://funpay.com/');
    let homeText = await homeRes.text();
    let userMatch = homeText.match(/href="https:\/\/funpay\.com\/users\/(\d+)\/"/);
    if (!userMatch) throw new Error("Пользователь не авторизован на FunPay");
    
    let userId = userMatch[1];
    
    let profRes = await fetch(`https://funpay.com/users/${userId}/`);
    let profText = await profRes.text();
    
    let nodeMatches = [...profText.matchAll(/href="https:\/\/funpay\.com\/lots\/(\d+)\/"/g)];
    let uniqueNodes = [...new Set(nodeMatches.map(m => m[1]))];
    
    let bumpedCount = 0;
    
    for (let nodeId of uniqueNodes) {
      let catRes = await fetch(`https://funpay.com/lots/${nodeId}/trade`);
      let catText = await catRes.text();
      
      let gameMatch = catText.match(/data-game="(\d+)"/);
      if (gameMatch) {
        let gameId = gameMatch[1];
        let formData = new FormData();
        formData.append('game_id', gameId);
        formData.append('node_id', nodeId);
        
        let bumpRes = await fetch('https://funpay.com/lots/raise', {
          method: 'POST',
          body: formData,
          headers: {
            'x-requested-with': 'XMLHttpRequest'
          }
        });
        
        if (bumpRes.ok) {
            let bumpJson = await bumpRes.json().catch(e => null);
            if (bumpJson && bumpJson.error) {
                console.log("Bump not allowed yet for", nodeId, bumpJson.error);
            } else {
                bumpedCount++;
            }
        }
      }
    }
    
    notify(`Бамп завершен! Успешно поднято категорий: ${bumpedCount}`);
    return bumpedCount;
  } catch (err) {
    console.error("Bump failed:", err);
    throw err;
  }
}

function notify(msg) {
    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            title: 'FunPay Pro',
            message: msg
        });
    } catch(e){}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'triggerBumpNow') {
    performBump().then(count => {
      sendResponse({success: true, count: count});
    }).catch(err => {
      sendResponse({success: false, error: err.message});
    });
    return true; 
  }
  
  if (msg.action === 'doMultiPost') {
    (async () => {
       let successCount = 0;
       for (let targetNodeId of msg.targetNodes) {
           let formData = new FormData();
           for (let [k, v] of msg.formDataEntries) {
               if (k === 'node_id') formData.append(k, targetNodeId);
               else formData.append(k, v);
           }
           let res = await fetch('https://funpay.com/lots/offerSave', {
               method: 'POST',
               body: formData,
               headers: {
                 'x-requested-with': 'XMLHttpRequest'
               }
           });
           if (res.ok) successCount++;
       }
       notify(`Мульти-постинг завершен. Создано копий: ${successCount}`);
    })();
    return false;
  }
});
