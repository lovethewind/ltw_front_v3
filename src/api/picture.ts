import request from '@/utils/request'

const apiName = '/picture'

export default {

  getPictureAlbumPageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/common/album/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getUserPictureAlbumPageList(page: number, limit: number, userId: string, params: object) {
    return request({
      url: `${apiName}/album/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getAlbumPicturePageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/common/picture/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  getUserAlbumPicturePageList(page: number, limit: number, params: object) {
    return request({
      url: `${apiName}/picture/${page}/${limit}`,
      method: 'get',
      params: params
    })
  },

  savePictureAlbum(pictureAlbum: object) {
    return request({
      url: `${apiName}/album/add`,
      method: 'post',
      data: pictureAlbum
    })
  },

  updatePictureAlbum(pictureAlbum: object) {
    return request({
      url: `${apiName}/album/update`,
      method: 'put',
      data: pictureAlbum
    })
  },

  deletePictureAlbum(albumId: string) {
    return request({
      url: `${apiName}/album/delete/${albumId}`,
      method: 'delete'
    })
  },

  savePicture(picture: object) {
    return request({
      url: `${apiName}/add`,
      method: 'post',
      data: picture
    })
  },

  updatePicture(picture: object) {
    return request({
      url: `${apiName}/update`,
      method: 'put',
      data: picture
    })
  },

  thumbPicture(id: string) {
    return request({
      url: `${apiName}/thumbUp/${id}`,
      method: 'post'
    })
  },

  deletePicture(data: any) {
    return request({
      url: `${apiName}/delete`,
      method: 'delete',
      data
    })
  }
}
