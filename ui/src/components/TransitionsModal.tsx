import { Backdrop, Box, Fade, Modal } from '@mui/material'
import { styled } from '@mui/material/styles'

const ModalContent = styled(Box)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  // width: 400,
  padding: 4,
  // bgcolor: 'background.paper',
  // border: '2px solid #000',
  // boxShadow: '0 0 10px 1px #000',
})) as typeof Box

interface TransitionsModalProps extends React.PropsWithChildren {
  isSelectorOpen: boolean
  setIsSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function TransitionsModal(props: TransitionsModalProps) {
  return (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={props.isSelectorOpen}
      onClose={() => props.setIsSelectorOpen(false)}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={props.isSelectorOpen}>
        <ModalContent>
          {props.children}
        </ModalContent>
      </Fade>
    </Modal>
  )
}