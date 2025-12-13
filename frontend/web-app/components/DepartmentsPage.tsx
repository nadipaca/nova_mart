"use client";

import Link from "next/link";
import { 
  Laptop, Headphones, Monitor, Keyboard, 
  Coffee, Zap, Phone, Package 
} from "lucide-react";

const departments = [
  { name: "Electronics", icon: <Laptop size={48} />, count: "1000+ items", color: "bg-blue-100 text-blue-600" },
  { name: "Computers", icon: <Monitor size={48} />, count: "500+ items", color: "bg-purple-100 text-purple-600" },
  { name: "Audio & Headphones", icon: <Headphones size={48} />, count: "300+ items", color: "bg-pink-100 text-pink-600" },
  { name: "Accessories", icon: <Keyboard size={48} />, count: "800+ items", color: "bg-green-100 text-green-600" },
  { name: "Home Appliances", icon: <Coffee size={48} />, count: "400+ items", color: "bg-orange-100 text-orange-600" },
  { name: "Small Appliances", icon: <Zap size={48} />, count: "250+ items", color: "bg-yellow-100 text-yellow-600" },
  { name: "Mobile Phones", icon: <Phone size={48} />, count: "200+ items", color: "bg-red-100 text-red-600" },
  { name: "All Products", icon: <Package size={48} />, count: "3000+ items", color: "bg-gray-100 text-gray-600" },
];

export default function DepartmentsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">All Departments</h1>
        <p className="text-gray-600">Browse products by category</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {departments.map((dept) => (
          <Link
            key={dept.name}
            href={dept.name === "All Products" ? "/products" : `/departments/${dept.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="group"
          >
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className={`${dept.color} w-20 h-20 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                {dept.icon}
              </div>
              <h3 className="font-bold text-lg text-center mb-1 group-hover:text-blue-600 transition-colors">
                {dept.name}
              </h3>
              <p className="text-sm text-gray-500 text-center">{dept.count}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}