import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='container px-4 2xl:px-20 mx-auto flex items-center justify-between gap-4 py-3 mt-20'>
      <img
        className="h-16 sm:h-20 md:h-10 w-auto max-w-[min(380px,85vw)] object-contain object-left shrink-0"
        src={assets.logo}
        alt="JobLens"
      />
      <p className='flex-1 border-l border-gray-400 pl-4 text-sm text-gray-500 max-sm:hidden'>© {new Date().getFullYear()} JobLens. All rights reserved.</p>
      <div className='flex gap-2.5'>
        <img width={38} src={assets.facebook_icon} alt="" />
        <img width={38} src={assets.twitter_icon} alt="" />
        <img width={38} src={assets.instagram_icon} alt="" />
      </div>
    </div>
  )
}

export default Footer