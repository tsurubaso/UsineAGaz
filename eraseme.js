node1:
  environment:
    - WEB_PORT=3000
  ports:
    - "3001:3000"

node2:
  environment:
    - WEB_PORT=3000
  ports:
    - "3002:3000"

node3:
  environment:
    - WEB_PORT=3000
  ports:
    - "3003:3000"
