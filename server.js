const superstatic = require("superstatic");
const connect = require("connect");

const node_modules = superstatic({
  config: {
    public: "node_modules"
  }
});
const site = superstatic({
  config: {
    public: ".tmp"
  }
});
const app = connect();
app.use("/node_modules", node_modules);
app.use(site);

const port = 8080;
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
