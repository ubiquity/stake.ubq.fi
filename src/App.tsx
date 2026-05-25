import { DashboardPage } from "./components/dashboard-page";
import { RpcHealthNotice } from "./components/rpc-health-notice";

function App() {
  return (
    <>
      <RpcHealthNotice />
      <DashboardPage />
    </>
  );
}

export default App;
