import GamePlaceholder from "../../../components/GamePlaceholder";

function FlappyPage({ me, onLogout, onOpenLogin }) {
  return (
    <GamePlaceholder
      gameId="flappy"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />
  );
}

export default FlappyPage;
