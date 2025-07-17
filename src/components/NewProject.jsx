import Input from "./Input.jsx";
import Button from "./Button.jsx";
import { useRef } from "react";
import Modal from "./Modal.jsx";

export default function NewProject({ onAdd, onCancel }) {
  const modal = useRef();

  // To connect to input HTML elements, interact with those element and retrieve the value of userinput
  const title = useRef();
  const description = useRef();
  const dueDate = useRef();

  function handleSave() {
    // Use .value to handle input's value
    const enteredTitle = title.current.value;
    const enteredDescription = description.current.value;
    const enteredDueDate = dueDate.current.value;

    // Show error modal if enteredTitle.trim() === '' condition is met
    if (
      enteredTitle.trim() === "" ||
      enteredDescription.trim() === "" ||
      enteredDueDate.trim() === ""
    ) {
      // 入力不正
      modal.current.open();
      return; // Prevent from calling onAdd(), when it is getting errors
    }

    // validation (assume valid data is entered)...
    onAdd({
      title: enteredTitle,
      description: enteredDescription,
      dueDate: enteredDueDate,
    });
  }

  return (
    <>
      <Modal ref={modal} buttonCaption="閉じる">
        <h2 className="text-xl font-bold text-stone-700 my-4">
          無効な入力です
        </h2>
        <p className="text-stone-600 mb-4">未入力の項目があります</p>
        <p className="text-stone-600 mb-4">
          各入力項目に正しい値が入力されていることを確認してください
        </p>
      </Modal>
      {/* w-[custom value] */}
      <div className="w-[35rem] mt-16">
        {/* Pushing all the buttons to the end of the horizontal axis */}
        <menu className="flex items-center justify-end gap-4 my-4">
          <li>
            {/* Not too obvious */} {/* Should change the state of compoents */}
            <button
              onClick={onCancel}
              className="text-stone-600 hover:text-stone-950"
            >
              キャンセル
            </button>
          </li>
          <li>
            <Button onClick={handleSave}>保存</Button>
          </li>
        </menu>
        <div>
          <Input type="text" ref={title} label="商品コード" />{" "}
          {/* Collect data: onChange={} */}
          <Input ref={description} label="商品詳細" textarea />{" "}
          {/* Setting textarea to TRUE */}
          <Input type="date" ref={dueDate} label="賞味期限" />
        </div>
      </div>
    </>
  );
}
