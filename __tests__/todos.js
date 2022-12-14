const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
//const { JSON } = require("sequelize");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
  //res.render(req.flash(type, message));
};
describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(process.env.PORT || 4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign Up", async () => {
    let res = await agent.get("/signup");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Aneri",
      lastName: "Patel",
      email: "aneripatel@gmail.com",
      password: "111",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    //res.render(req.flash(type, message));
  });

  test("Sign out", async () => {
    try{
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
    }
    catch(err)
    {console.log(err);}
  });

  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    try{
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  }catch(err)
  {console.log(err);}
  });

  test("Marks a todo with the given ID as complete", async () => {
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
      try{
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];
    const status = latestTodo.completed ? false : true;
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: status,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
      }
    catch(err)
  {console.log(err);}
  });

  test("User can not delete other user's todo", async () => {
    try{
    let res = await agent.get("/signup");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Kirtida",
      lastName: "Patel",
      email: "kirtidapatel@gmail.com",
      password: "111",
      _csrf: csrfToken,
    });
     res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const kirtidaId = res.id;
    await agent.get("/signout");
    res = await agent.get("/signup");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Tiku",
      lastName: "Patel",
      email: "tikupatel@gmail.com",
      password: "111",
      _csrf: csrfToken,
    });
   
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deletedTodo = await agent
      .delete(`/todos/${kirtidaId}`)
      .send({ _csrf: csrfToken });

    expect(deletedTodo.text).toBe("false");
  }
  catch(err)
  {console.log(err);}
  
  });

  test("User can not update other user's todo", async () => {
      try{
      let res = await agent.get("/signup");
      let csrfToken = extractCsrfToken(res);
      res = await agent.post("/users").send({
        firstName: "Kirtida",
        lastName: "Patel",
        email: "kirtidapatel@gmail.com",
        password: "111",
        _csrf: csrfToken,
      });
       res = await agent.get("/todos");
      csrfToken = extractCsrfToken(res);
      res = await agent.post("/todos").send({
        title: "Buy milk",
        dueDate: new Date().toISOString(),
        completed: false,
        _csrf: csrfToken,
      });
      const kirtidaId = res.id;
      await agent.get("/signout");
      res = await agent.get("/signup");
      csrfToken = extractCsrfToken(res);
      res = await agent.post("/users").send({
        firstName: "Tiku",
        lastName: "Patel",
        email: "tikupatel@gmail.com",
        password: "111",
        _csrf: csrfToken,
      });
     
      res = await agent.get("/todos");
      csrfToken = extractCsrfToken(res);
  
      const updatedTodo = await agent
        .put(`/todos/${kirtidaId}`)
        .send({ _csrf: csrfToken });
  
      expect(updatedTodo.text).toBe("false");
    }
    catch(err)
    {console.log(err);}
    });
  
  test("Deletes a todo with the given ID if it exists and sends a boolean response", async () => {
    // FILL IN YOUR CODE HERE
    const agent = request.agent(server);
    await login(agent, "aneripatel@gmail.com", "111");
    var res = await agent.get("/todos");
    var csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy xbox1",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
      try{
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;

    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    const todoID = latestTodo.id;
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deletedTodo = await agent
      .delete(`/todos/${todoID}`)
      .send({ _csrf: csrfToken });

    expect(deletedTodo.text).toBe("true");
      }catch(err)
      {console.log(err);}
  });
});