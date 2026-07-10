export default function Navbar() {
  return (
    <div className="w-full h-16 bg-white border-b flex items-center justify-between px-6">
      
      {/* Left Side */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard
        </h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        
        {/* Notification Icon Placeholder */}
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300">
          🔔
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3">
          
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
            A
          </div>

          {/* Name */}
          <div>
          <p className="font-semibold text-sm text-gray-800">
              Process Copilot
            </p>

            <p className="text-xs text-gray-500">
              Process Optimization Engineer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}