import { Switch, Route, Router as WouterRouter } from "wouter";
import HomePage from "@/pages/Home";
import MobileIdPage from "@/pages/MobileId";
import AdultVerifyPage from "@/pages/AdultVerify";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/mobile-id" component={MobileIdPage} />
      <Route path="/adult-verify" component={AdultVerifyPage} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
