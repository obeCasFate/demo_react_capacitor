import image from "../assets/no-projects.png";
import Button from "./Button.jsx";

export default function NoProjectSelected({ onStartAddProject }) {
  return (
    <div className="mt-24 text-center w-2/3">
      {/* object-contain: prevent image from getting distorted, mx-auto: make sure it is centered */}
      <img
        src={image}
        alt="An empty task list"
        className="w-16 h-16 object-contain mx-auto"
      />
      <h2 className="text-xl font-bold text-stone-500 my-4">
        項目が選択されていません
      </h2>
      <p className="text-stone-400 mb-4">
        既存データタを選ぶか、新規データを登録しましょう
      </p>
      <p className="mb-8">
        <Button onClick={onStartAddProject}>データの登録</Button>
      </p>
    </div>
  );
}
