import GamePlaceholder from "../../../components/GamePlaceholder";

function TetrisPage({ me, onLogout, onOpenLogin }) {
  return (
    <GamePlaceholder
      gameId="tetris"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />
  );
}

export default TetrisPage;
