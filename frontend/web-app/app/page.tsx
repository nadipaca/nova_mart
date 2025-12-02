import { Navbar } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductGrid";
import { RecommendedSection } from "@/components/RecommendedSection";
import { ChevronRight, Truck, Shield, RotateCcw, Headphones } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to NovaMart
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover amazing products at unbeatable prices
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Shop Now
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Feature icon={<Truck />} title="Free Shipping" text="On orders over $50" />
            <Feature icon={<Shield />} title="Secure Payment" text="100% secure transactions" />
            <Feature icon={<RotateCcw />} title="Easy Returns" text="30-day return policy" />
            <Feature icon={<Headphones />} title="24/7 Support" text="Dedicated support team" />
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Personalized Recommendations */}
        <RecommendedSection />

        {/* Categories */}
        <section className="mt-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryCard name="Electronics" image="/categories/electronics.jpg" />
            <CategoryCard name="Clothing" image="/categories/clothing.jpg" />
            <CategoryCard name="Home & Garden" image="/categories/home.jpg" />
            <CategoryCard name="Sports" image="/categories/sports.jpg" />
          </div>
        </section>

        {/* Featured Products */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <Link href="/products" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View All
              <ChevronRight size={20} />
            </Link>
          </div>
          {/* ProductGrid component here */}
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-blue-600 mb-2">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}

function CategoryCard({ name, image }: { name: string; image: string }) {
  return (
    <Link href={`/categories/${name.toLowerCase()}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div className="aspect-square bg-gray-100 relative">
          {/* Category image */}
        </div>
        <div className="p-4 text-center">
          <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{name}</h3>
        </div>
      </div>
    </Link>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-xl mb-4">NovaMart</h3>
            <p className="text-sm">Your trusted online marketplace for quality products.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white">All Products</Link></li>
              <li><Link href="/deals" className="hover:text-white">Deals</Link></li>
              <li><Link href="/new" className="hover:text-white">New Arrivals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2024 NovaMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}