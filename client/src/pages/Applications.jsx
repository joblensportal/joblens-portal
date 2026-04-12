import { useContext, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import { AppContext } from '../context/AppContextValue'
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const Applications = () => {

  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  const [isEdit, setIsEdit] = useState(false)
  const [resume, setResume] = useState(null)
  const [openingResume, setOpeningResume] = useState(false)

  const { backendUrl, userData, userApplications, fetchUserData, fetchUserApplications } = useContext(AppContext)

  const openMyResume = async () => {
    try {
      setOpeningResume(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/users/my-resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      // Do not pass noopener in the features string: it makes window.open return null even when the tab opens.
      const w = window.open(url, '_blank')
      if (w) w.opener = null
      else toast.error('Allow pop-ups to view your resume')
      setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (error) {
      let msg = 'Failed to open resume'
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          if (parsed.message) msg = parsed.message
        } catch {
          /* ignore */
        }
      } else if (error.response?.data?.message) {
        msg = error.response.data.message
      }
      toast.warning(`${msg} Trying direct link…`)
      if (userData?.resume && /^https?:\/\//i.test(userData.resume)) {
        const w = window.open(userData.resume.trim(), '_blank')
        if (w) w.opener = null
      }
    } finally {
      setOpeningResume(false)
    }
  }

  const updateResume = async () => {

    try {
      if (!resume) {
        toast.error('Please select a resume file first')
        return
      }

      const formData = new FormData()
      formData.append('resume', resume)

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/users/update-resume',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        await fetchUserData()
        setIsEdit(false)
        setResume(null)
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserApplications()
    }
  }, [user, fetchUserApplications])

  if (isLoaded && !user) {
    return (
      <>
        <Navbar />
        <div className='container px-4 2xl:px-20 mx-auto my-10 min-h-[65vh]'>
          <h2 className='text-xl font-semibold'>Please login to view your applications.</h2>
        </div>
        <Footer />
      </>
    )
  }

  return userData ? (
    <>
      <Navbar />
      <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10'>
        <h2 className='text-xl font-semibold'>Your Resume</h2>
        <div className='flex gap-2 mb-6 mt-3'>
          {
            isEdit || userData && userData.resume === ""
              ? <>
                <label className='flex items-center' htmlFor="resumeUpload">
                  <p className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg mr-2'>{resume ? resume.name : "Select Resume"}</p>
                  <input id='resumeUpload' onChange={e => setResume(e.target.files[0])} accept='application/pdf' type="file" hidden />
                  <img src={assets.profile_upload_icon} alt="" />
                </label>
                <button onClick={updateResume} className='bg-green-100 border border-green-400 rounded-lg px-4 py-2'>Save</button>
              </>
              : <div className='flex gap-2'>
                <button
                  type='button'
                  disabled={!userData.resume || openingResume}
                  onClick={openMyResume}
                  className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {openingResume ? 'Opening…' : 'Resume'}
                </button>
                <button onClick={() => setIsEdit(true)} className='text-gray-500 border border-gray-300 rounded-lg px-4 py-2'>
                  Edit
                </button>
              </div>
          }
        </div>
        <h2 className='text-xl font-semibold mb-4'>Jobs Applied</h2>
        <table className='min-w-full bg-white border rounded-lg'>
          <thead>
            <tr>
              <th className='py-3 px-4 border-b text-left'>Company</th>
              <th className='py-3 px-4 border-b text-left'>Job Title</th>
              <th className='py-3 px-4 border-b text-left max-sm:hidden'>Location</th>
              <th className='py-3 px-4 border-b text-left max-sm:hidden'>Date</th>
              <th className='py-3 px-4 border-b text-left'>Status</th>
            </tr>
          </thead>
          <tbody>
            {userApplications.map((job, index) => (
              <tr key={index}>
                <td className='py-3 px-4 flex items-center gap-2 border-b'>
                  <img className='w-8 h-8' src={job.companyId.image} alt="" />
                  {job.companyId.name}
                </td>
                <td className='py-2 px-4 border-b'>{job.jobId.title}</td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{job.jobId.location}</td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{moment(job.date).format('ll')}</td>
                <td className='py-2 px-4 border-b'>
                  <span className={`${job.status === 'Accepted' ? 'bg-green-100' : job.status === 'Rejected' ? 'bg-red-100' : 'bg-blue-100'} px-4 py-1.5 rounded`}>
                    {job.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  ) : <Loading />
}

export default Applications