NODE_ID=node2 P2P_PORT=5002 WEB_PORT=3002 node index.js

$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
$env:NODE_ID="node3"; $env:P2P_PORT="5003"; $env:WEB_PORT="3003"; node index.js


$env:NODE_ID="node1"
$env:P2P_PORT="5001"
$env:WEB_PORT="3001"

node index.js
