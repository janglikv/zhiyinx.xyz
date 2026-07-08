import GamePlaceholder from "../../../components/GamePlaceholder";

function SnakePage({ me, onLogout, onOpenLogin }) {
  return (
    <GamePlaceholder
      gameId="snake"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />
  );
}

export default SnakePage;
