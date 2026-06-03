import { Outlet } from 'react-router-dom';

function UserLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}

export default UserLayout;
