function generateProxies(count) {
    const host = "datacenter.proxyempire.io";
    const port = "9000";
    const password = "b4adccb73d";
  
    function generateId() {
      const characters = '0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }
  
    const proxies = [];
    for (let i = 0; i < count; i++) {
      const sessionId = generateId();
      const username = `3954360552;any;session_${sessionId}`;
      const proxy = `http://${username}:${password}@${host}:${port}`;
      proxies.push(proxy);
    }
    return proxies;
  }
  
  const proxies = generateProxies(100);
  console.log(proxies.join("\n"));
  