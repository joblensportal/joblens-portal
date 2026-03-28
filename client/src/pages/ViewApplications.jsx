import { useCallback, useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContextValue'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {

  const { backendUrl, companyToken } = useContext(AppContext)

  const [applicants, setApplicants] = useState(false)
  const [openingResumeId, setOpeningResumeId] = useState(null)

  const openResume = async (applicationId) => {
    try {
      setOpeningResumeId(applicationId)
      const { data } = await axios.get(
        `${backendUrl}/api/company/resume/${applicationId}`,
        { headers: { token: companyToken }, responseType: 'blob' }
      )
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) {
        toast.error('Allow pop-ups to view the resume')
      }
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
      toast.error(msg)
    } finally {
      setOpeningResumeId(null)
    }
  }

  // Function to fetch company Job Applications data 
  const fetchCompanyJobApplications = useCallback(async () => {

    try {

      const { data } = await axios.get(backendUrl + '/api/company/applicants',
        { headers: { token: companyToken } }
      )

      if (data.success) {
        setApplicants(data.applications.reverse())
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }, [backendUrl, companyToken])

  // Function to Update Job Applications Status 
  const changeJobApplicationStatus = async (id, status) => {
    try {

      const { data } = await axios.post(backendUrl + '/api/company/change-status',
        { id, status },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        fetchCompanyJobApplications()
        if (data.emailSent === true) {
          toast.success('Status updated. Applicant was emailed.')
        } else if (data.emailSent === false && data.emailError) {
          toast.warning(`Status updated, but email failed: ${data.emailError}`)
        } else {
          toast.success('Status updated.')
        }
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (companyToken) {
      fetchCompanyJobApplications()
    }
  }, [companyToken, fetchCompanyJobApplications])

  return applicants ? applicants.length === 0 ? (
    <div className='flex items-center justify-center h-[70vh]'>
      <p className='text-xl sm:text-2xl'>No Applications Available</p>
    </div>
  ) : (
    <div className='container mx-auto p-4'>
      <div>
        <table className='w-full max-w-4xl bg-white border border-gray-200 max-sm:text-sm'>
          <thead>
            <tr className='border-b'>
              <th className='py-2 px-4 text-left'>#</th>
              <th className='py-2 px-4 text-left'>User name</th>
              <th className='py-2 px-4 text-left max-sm:hidden'>Job Title</th>
              <th className='py-2 px-4 text-left max-sm:hidden'>Location</th>
              <th className='py-2 px-4 text-left'>Resume</th>
              <th className='py-2 px-4 text-left'>Action</th>
            </tr>
          </thead>
          <tbody>
            {applicants.filter(item => item.jobId && item.userId).map((applicant, index) => (
              <tr key={index} className='text-gray-700'>
                <td className='py-2 px-4 border-b text-center'>{index + 1}</td>
                <td className='py-2 px-4 border-b text-center flex items-center'>
                  <img className='w-10 h-10 rounded-full mr-3 max-sm:hidden' src={applicant.userId.image} alt="" />
                  <span>{applicant.userId.name}</span>
                </td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{applicant.jobId.location}</td>
                <td className='py-2 px-4 border-b'>
                  <button
                    type='button'
                    disabled={!applicant.userId.resume || openingResumeId === applicant._id}
                    onClick={() => openResume(applicant._id)}
                    className='bg-blue-50 text-blue-400 px-3 py-1 rounded inline-flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {openingResumeId === applicant._id ? 'Opening…' : 'Resume'}{' '}
                    <img src={assets.resume_download_icon} alt="" />
                  </button>
                </td>
                <td className='py-2 px-4 border-b relative'>
                  {applicant.status === "Pending"
                    ? <div className='relative inline-block text-left group'>
                      <button className='text-gray-500 action-button'>...</button>
                      <div className='z-10 hidden absolute right-0 md:left-0 top-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow group-hover:block'>
                        <button onClick={() => changeJobApplicationStatus(applicant._id, 'Accepted')} className='block w-full text-left px-4 py-2 text-blue-500 hover:bg-gray-100'>Accept</button>
                        <button onClick={() => changeJobApplicationStatus(applicant._id, 'Rejected')} className='block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100'>Reject</button>
                      </div>
                    </div>
                    : <div>{applicant.status}</div>
                  }

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : <Loading />
}

export default ViewApplications