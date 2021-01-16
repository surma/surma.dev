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
app.use(site)

app.listen(8080);