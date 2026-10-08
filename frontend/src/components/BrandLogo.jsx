const logoUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsqWU2ZmVmPAwEUFpsArYUwqoOyEiTpvym65fxo42hzA&s=10';

export default function BrandLogo({ className = '' }) {
  return (
    <img
      src={logoUrl}
      alt="SUN SOLAR"
      className={`block rounded-lg bg-[#101211] object-cover object-[center_100%] ${className}`}
    />
  );
}
