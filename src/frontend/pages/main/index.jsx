import Background from "../../components/Background";
import Header from "../../components/Header";

function Main({ me, onLogout, onOpenLogin }) {
  return (
    <>
      <Background />
      <Header me={me} onLogout={onLogout} onOpenLogin={onOpenLogin} />

      <main
        style={{
          minHeight: "100vh",
          position: "relative",
          padding: "24px",
          paddingTop: "74px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 这里是主页主体内容，目前为空 */}
      </main>
    </>
  );
}

export { Main as default };


