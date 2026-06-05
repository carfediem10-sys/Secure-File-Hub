import { Switch, Route, Router as WouterRouter } from "wouter";
import GateScreen from "@/components/GateScreen";
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
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  // 성인인증 페이지는 QR 스켄 사용자가 사용하므로 게이트 방지
  const isVerify = window.location.pathname.replace(base, "") === "/adult-verify";

  return (
    <WouterRouter base={base}>
      {isVerify ? <Router /> : (
        <GateScreen>
          <Router />
        </GateScreen>
      )}
    </WouterRouter>
  );
}

export default App;
